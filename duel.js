const db = firebase.database();
const uid = localStorage.getItem("jojoland_userId");
const list = document.getElementById("list");

function create() {
    const bet = +document.getElementById("bet").value;
    if (bet <= 0) return alert("Неверная ставка");

    db.ref("holiday_points/" + uid + "/available_points")
    .once("value", s => {
        if ((s.val() || 0) < bet) {
            alert("Недостаточно очков");
            return;
        }

        db.ref("casino_duels").push({
            creator: uid,
            bet,
            status: "waiting",
            locked: false,
            created: Date.now()
        });
    });
}

db.ref("casino_duels").on("value", snap => {
    list.innerHTML = "";
    snap.forEach(d => {
        const v = d.val();
        if (v.status === "waiting" && v.creator !== uid) {
            list.innerHTML += `
                <button onclick="join('${d.key}')">
                    ⚔️ Дуэль | ${v.bet} очков
                </button>`;
        }
    });
});

function join(id) {
    const duelRef = db.ref("casino_duels/" + id);

    duelRef.transaction(duel => {
        if (!duel) return;
        if (duel.status !== "waiting") return;
        if (duel.locked) return;

        duel.locked = true;
        duel.opponent = uid;
        duel.status = "active";
        return duel;
    }, async (err, committed, snap) => {
        if (!committed) return;

        const duel = snap.val();
        const bet = duel.bet;
        const p1 = duel.creator;
        const p2 = duel.opponent;

        const p1Ref = db.ref("holiday_points/" + p1 + "/available_points");
        const p2Ref = db.ref("holiday_points/" + p2 + "/available_points");

        const [b1, b2] = await Promise.all([
            p1Ref.once("value"),
            p2Ref.once("value")
        ]);

        if (b1.val() < bet || b2.val() < bet) {
            duelRef.update({ status: "cancelled" });
            alert("У кого-то не хватает очков");
            return;
        }

        const winner = Math.random() < 0.5 ? p1 : p2;
        const loser = winner === p1 ? p2 : p1;

        await Promise.all([
            db.ref("holiday_points/" + winner + "/available_points")
              .transaction(p => p + bet),
            db.ref("holiday_points/" + loser + "/available_points")
              .transaction(p => p - bet)
        ]);

        duelRef.update({
            status: "finished",
            winner,
            finished: Date.now()
        });

        alert(winner === uid ? "🎉 Ты выиграл!" : "❌ Ты проиграл");
    });
}
