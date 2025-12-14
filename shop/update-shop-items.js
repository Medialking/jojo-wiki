// update-shop-items.js - Обновление товаров магазина в Firebase

const firebaseConfig = {
    apiKey: "AIzaSyBwhNixWO8dF_drN2hHVYzfTAbMCiT91Gw",
    authDomain: "jojoland-chat.firebasestorage.app",
    databaseURL: "https://jojoland-chat-default-rtdb.firebaseio.com",
    projectId: "jojoland-chat",
    storageBucket: "jojoland-chat.firebasestorage.app",
    messagingSenderId: "602788305122",
    appId: "1:602788305122:web:c03f5b5ef59c85fc9fe6bb"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

async function updateShopItems() {
    console.log('🔄 Обновляю товары магазина...');
    
    const fullDemoItems = {
        themes: [
            // Готовые градиенты (10 штук)
            {
                id: 'theme_fire_red',
                name: '🔥 Огненный шторм',
                description: 'Яркая красная тема с эффектами пламени',
                price: 150,
                type: 'theme',
                category: 'gradients',
                rarity: 'rare',
                gradient: 'linear-gradient(135deg, #ff0000, #ff6b6b, #ff8e8e)',
                textColor: '#ffffff',
                icon: '🔥',
                pattern: 'none'
            },
            {
                id: 'theme_ocean_blue',
                name: '🌊 Океанские глубины',
                description: 'Прохладная синяя тема с градиентом волн',
                price: 120,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #0066cc, #0099ff, #00ccff)',
                textColor: '#ffffff',
                icon: '🌊',
                pattern: 'waves'
            },
            {
                id: 'theme_forest_green',
                name: '🌲 Лесное царство',
                description: 'Зеленая тема с градиентом лесной листвы',
                price: 100,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #228B22, #32CD32, #90EE90)',
                textColor: '#ffffff',
                icon: '🌲',
                pattern: 'leaves'
            },
            {
                id: 'theme_purple_magic',
                name: '🔮 Магический туман',
                description: 'Мистическая фиолетовая тема',
                price: 180,
                type: 'theme',
                category: 'gradients',
                rarity: 'rare',
                gradient: 'linear-gradient(135deg, #8A2BE2, #9370DB, #BA55D3)',
                textColor: '#ffffff',
                icon: '🔮',
                pattern: 'stars'
            },
            {
                id: 'theme_sunset',
                name: '🌅 Закатное небо',
                description: 'Тема с градиентом закатного неба',
                price: 130,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #FF4500, #FF8C00, #FFD700)',
                textColor: '#ffffff',
                icon: '🌅',
                pattern: 'none'
            },
            {
                id: 'theme_ice_cold',
                name: '❄️ Ледяная пустошь',
                description: 'Холодная тема с ледяным градиентом',
                price: 110,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #E0FFFF, #AFEEEE, #00CED1)',
                textColor: '#000080',
                icon: '❄️',
                pattern: 'snowflakes'
            },
            {
                id: 'theme_neon_pink',
                name: '💖 Неоновый взрыв',
                description: 'Яркая неоновая розовая тема',
                price: 170,
                type: 'theme',
                category: 'gradients',
                rarity: 'rare',
                gradient: 'linear-gradient(135deg, #FF00FF, #FF69B4, #FFB6C1)',
                textColor: '#ffffff',
                icon: '💖',
                pattern: 'neon'
            },
            {
                id: 'theme_midnight',
                name: '🌙 Полночное небо',
                description: 'Темная тема для ночных игроков',
                price: 140,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #191970, #000080, #00008B)',
                textColor: '#ffffff',
                icon: '🌙',
                pattern: 'stars'
            },
            {
                id: 'theme_golden_sun',
                name: '☀️ Золотое солнце',
                description: 'Теплая золотая тема',
                price: 160,
                type: 'theme',
                category: 'gradients',
                rarity: 'rare',
                gradient: 'linear-gradient(135deg, #FFD700, #FFEC8B, #FFFACD)',
                textColor: '#8B4513',
                icon: '☀️',
                pattern: 'sun'
            },
            {
                id: 'theme_earth_tone',
                name: '🌎 Земные тона',
                description: 'Природная тема в земных тонах',
                price: 125,
                type: 'theme',
                category: 'gradients',
                rarity: 'common',
                gradient: 'linear-gradient(135deg, #8B4513, #A0522D, #D2691E)',
                textColor: '#ffffff',
                icon: '🌎',
                pattern: 'none'
            },
            
            // Эксклюзивные темы (5 штук)
            {
                id: 'theme_golden_royal',
                name: '👑 Золотая королевская',
                description: 'Роскошная золотая тема для настоящих королей',
                price: 250,
                type: 'theme',
                category: 'special',
                rarity: 'epic',
                gradient: 'linear-gradient(135deg, #FFD700, #FFEC8B, #FFFACD)',
                textColor: '#8B4513',
                icon: '👑',
                pattern: 'crowns'
            },
            {
                id: 'theme_galaxy',
                name: '🌌 Галактическая тема',
                description: 'Космическая тема с градиентом далеких галактик',
                price: 300,
                type: 'theme',
                category: 'special',
                rarity: 'legendary',
                gradient: 'linear-gradient(135deg, #000033, #330066, #6600cc)',
                textColor: '#ffffff',
                icon: '🌌',
                pattern: 'stars'
            },
            {
                id: 'theme_rainbow',
                name: '🌈 Радужная тема',
                description: 'Яркая радужная тема со всеми цветами',
                price: 200,
                type: 'theme',
                category: 'special',
                rarity: 'epic',
                gradient: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #8B00FF)',
                textColor: '#ffffff',
                icon: '🌈',
                pattern: 'confetti'
            },
            {
                id: 'theme_dragon_fire',
                name: '🐉 Драконий огонь',
                description: 'Мощная тема с огнем дракона',
                price: 280,
                type: 'theme',
                category: 'special',
                rarity: 'legendary',
                gradient: 'linear-gradient(135deg, #DC143C, #FF4500, #FF8C00)',
                textColor: '#FFD700',
                icon: '🐉',
                pattern: 'fire'
            },
            {
                id: 'theme_universe',
                name: '✨ Бесконечная вселенная',
                description: 'Тема с бесконечными звездами и галактиками',
                price: 350,
                type: 'theme',
                category: 'special',
                rarity: 'mythic',
                gradient: 'linear-gradient(135deg, #000000, #1a1a2e, #16213e)',
                textColor: '#00ffff',
                icon: '✨',
                pattern: 'universe'
            }
        ],
        decorations: [
            // Бейджи (6 штук)
            {
                id: 'badge_gold_star',
                name: '⭐ Золотая звезда',
                description: 'Блестящий золотой бейдж со звездой',
                price: 50,
                type: 'badge',
                rarity: 'common',
                icon: '⭐',
                slot: 'badge'
            },
            {
                id: 'badge_fire',
                name: '🔥 Бейдж огня',
                description: 'Горящий бейдж с анимацией огня',
                price: 75,
                type: 'badge',
                rarity: 'rare',
                icon: '🔥',
                slot: 'badge'
            },
            {
                id: 'badge_crown',
                name: '👑 Королевский бейдж',
                description: 'Бейдж в виде королевской короны',
                price: 100,
                type: 'badge',
                rarity: 'epic',
                icon: '👑',
                slot: 'badge'
            },
            {
                id: 'badge_dragon',
                name: '🐲 Бейдж дракона',
                description: 'Мифический бейдж с драконом',
                price: 150,
                type: 'badge',
                rarity: 'legendary',
                icon: '🐲',
                slot: 'badge'
            },
            {
                id: 'badge_shield',
                name: '🛡️ Бейдж защитника',
                description: 'Прочный бейдж в виде щита',
                price: 65,
                type: 'badge',
                rarity: 'common',
                icon: '🛡️',
                slot: 'badge'
            },
            {
                id: 'badge_rainbow',
                name: '🌈 Радужный бейдж',
                description: 'Разноцветный радужный бейдж',
                price: 85,
                type: 'badge',
                rarity: 'rare',
                icon: '🌈',
                slot: 'badge'
            },
            
            // Рамки аватара (5 штук)
            {
                id: 'frame_gold',
                name: '🖼️ Золотая рамка',
                description: 'Элегантная золотая рамка для аватара',
                price: 80,
                type: 'frame',
                rarity: 'rare',
                icon: '🖼️',
                slot: 'avatar_frame'
            },
            {
                id: 'frame_hearts',
                name: '💕 Рамка с сердцами',
                description: 'Милая рамка с плавающими сердцами',
                price: 60,
                type: 'frame',
                rarity: 'common',
                icon: '💕',
                slot: 'avatar_frame'
            },
            {
                id: 'frame_galaxy',
                name: '🌠 Галактическая рамка',
                description: 'Космическая рамка с вращающимися звездами',
                price: 120,
                type: 'frame',
                rarity: 'epic',
                icon: '🌠',
                slot: 'avatar_frame'
            },
            {
                id: 'frame_crystal',
                name: '💎 Кристальная рамка',
                description: 'Блестящая рамка из кристаллов',
                price: 95,
                type: 'frame',
                rarity: 'rare',
                icon: '💎',
                slot: 'avatar_frame'
            },
            {
                id: 'frame_fire',
                name: '🔥 Огненная рамка',
                description: 'Горящая рамка с анимацией огня',
                price: 110,
                type: 'frame',
                rarity: 'epic',
                icon: '🔥',
                slot: 'avatar_frame'
            },
            
            // Эффекты (5 штук)
            {
                id: 'effect_sparkles',
                name: '✨ Эффект сияния',
                description: 'Мерцающие частицы вокруг профиля',
                price: 90,
                type: 'effect',
                rarity: 'rare',
                icon: '✨',
                slot: 'effect'
            },
            {
                id: 'effect_confetti',
                name: '🎉 Эффект конфетти',
                description: 'Праздничные конфетти вокруг профиля',
                price: 70,
                type: 'effect',
                rarity: 'common',
                icon: '🎉',
                slot: 'effect'
            },
            {
                id: 'effect_rainbow',
                name: '🌈 Радужный эффект',
                description: 'Плавная радужная анимация',
                price: 110,
                type: 'effect',
                rarity: 'epic',
                icon: '🌈',
                slot: 'effect'
            },
            {
                id: 'effect_stardust',
                name: '🌠 Звездная пыль',
                description: 'Сверкающая звездная пыль вокруг профиля',
                price: 85,
                type: 'effect',
                rarity: 'rare',
                icon: '🌠',
                slot: 'effect'
            },
            {
                id: 'effect_aurora',
                name: '🎆 Северное сияние',
                description: 'Переливающееся северное сияние',
                price: 130,
                type: 'effect',
                rarity: 'legendary',
                icon: '🎆',
                slot: 'effect'
            },
            
            // Титулы (6 штук)
            {
                id: 'title_legend',
                name: '🏆 Легенда',
                description: 'Эксклюзивный титул "Легенда"',
                price: 200,
                type: 'title',
                rarity: 'legendary',
                icon: '🏆',
                slot: 'title'
            },
            {
                id: 'title_champion',
                name: '🥇 Чемпион',
                description: 'Почетный титул "Чемпион"',
                price: 150,
                type: 'title',
                rarity: 'epic',
                icon: '🥇',
                slot: 'title'
            },
            {
                id: 'title_hero',
                name: '🦸 Герой',
                description: 'Титул "Герой" под вашим ником',
                price: 100,
                type: 'title',
                rarity: 'rare',
                icon: '🦸',
                slot: 'title'
            },
            {
                id: 'title_warrior',
                name: '⚔️ Воин',
                description: 'Титул "Воин" для смелых игроков',
                price: 80,
                type: 'title',
                rarity: 'common',
                icon: '⚔️',
                slot: 'title'
            },
            {
                id: 'title_master',
                name: '🎓 Мастер',
                description: 'Титул "Мастер" для опытных игроков',
                price: 120,
                type: 'title',
                rarity: 'rare',
                icon: '🎓',
                slot: 'title'
            },
            {
                id: 'title_god',
                name: '⚡ Бог игры',
                description: 'Высший титул "Бог игры"',
                price: 250,
                type: 'title',
                rarity: 'mythic',
                icon: '⚡',
                slot: 'title'
            }
        ],
        animated: [
            {
                id: 'anim_flying_stars',
                name: '🌠 Летающие звезды',
                description: 'Анимированные звезды, летающие вокруг профиля',
                price: 150,
                type: 'animation',
                rarity: 'epic',
                icon: '🌠',
                animation: 'fly'
            },
            {
                id: 'anim_hearts',
                name: '💖 Парящие сердца',
                description: 'Анимированные сердца, поднимающиеся вверх',
                price: 120,
                type: 'animation',
                rarity: 'rare',
                icon: '💖',
                animation: 'float'
            },
            {
                id: 'anim_snow',
                name: '❄️ Падающий снег',
                description: 'Реалистичная анимация падающего снега',
                price: 100,
                type: 'animation',
                rarity: 'common',
                icon: '❄️',
                animation: 'snow'
            },
            {
                id: 'anim_fireworks',
                name: '🎆 Фейерверк',
                description: 'Праздничный фейерверк вокруг профиля',
                price: 180,
                type: 'animation',
                rarity: 'legendary',
                icon: '🎆',
                animation: 'fireworks'
            },
            {
                id: 'anim_bubbles',
                name: '🫧 Пузырьки',
                description: 'Плавно поднимающиеся пузырьки',
                price: 90,
                type: 'animation',
                rarity: 'common',
                icon: '🫧',
                animation: 'bubbles'
            },
            {
                id: 'anim_butterflies',
                name: '🦋 Бабочки',
                description: 'Порхающие анимированные бабочки',
                price: 130,
                type: 'animation',
                rarity: 'rare',
                icon: '🦋',
                animation: 'butterflies'
            },
            {
                id: 'anim_leaves',
                name: '🍃 Падающие листья',
                description: 'Осенние листья, плавно падающие вниз',
                price: 110,
                type: 'animation',
                rarity: 'common',
                icon: '🍃',
                animation: 'leaves'
            },
            {
                id: 'anim_sparkles',
                name: '✨ Мерцающие искры',
                description: 'Случайно появляющиеся и исчезающие искры',
                price: 95,
                type: 'animation',
                rarity: 'rare',
                icon: '✨',
                animation: 'sparkles'
            },
            {
                id: 'anim_rain',
                name: '🌧️ Идет дождь',
                description: 'Реалистичная анимация дождя',
                price: 105,
                type: 'animation',
                rarity: 'common',
                icon: '🌧️',
                animation: 'rain'
            },
            {
                id: 'anim_galaxy',
                name: '🌌 Вращающаяся галактика',
                description: 'Космическая галактика, медленно вращающаяся',
                price: 200,
                type: 'animation',
                rarity: 'legendary',
                icon: '🌌',
                animation: 'galaxy'
            }
        ]
    };
    
    try {
        // Сохраняем все товары в Firebase
        await database.ref('shop_items').set(fullDemoItems);
        console.log('✅ Все товары успешно обновлены!');
        console.log(`📊 Статистика:`);
        console.log(`   • Темы: ${fullDemoItems.themes.length} шт.`);
        console.log(`   • Украшения: ${fullDemoItems.decorations.length} шт.`);
        console.log(`   • Анимации: ${fullDemoItems.animated.length} шт.`);
        console.log(`   • Всего товаров: ${fullDemoItems.themes.length + fullDemoItems.decorations.length + fullDemoItems.animated.length} шт.`);
        
        alert('✅ Товары магазина успешно обновлены! Перезагрузите страницу магазина.');
        
    } catch (error) {
        console.error('❌ Ошибка обновления товаров:', error);
        alert('❌ Ошибка обновления товаров: ' + error.message);
    }
}

// Запускаем обновление
updateShopItems();
