require('dotenv').config(); // .env faylini o'qish uchun

module.exports = {
    apps: [
        {
            name: 'server', // PM2 ro'yxatida ko'rinadigan nom
            script: './src/index.js',      // Loyihaning kirish nuqtasi

            // --- Performance ---
            instances: 1,               // Nechta yadro ishlatilsin? ('max' qilsangiz hammasini ishlatadi)
            exec_mode: 'fork',          // 'cluster' yoki 'fork'.
            max_memory_restart: '200M',   // Agar 1GB RAM ishlatsa, avtomatik restart beradi

            // --- Behavior ---
            autorestart: true,          // Xato berib o'chsa, o'zi qayta yonadi
            watch: false,               // Productionda 'false' bo'lishi kerak (fayl o'zgarsa restart bermasligi uchun)
            ignore_watch: ['node_modules', 'logs'],

            // --- Environment Variables ---
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT || 3000 // .env dan PORT ni oladi, topilmasa 3000
            },
            env_production: {
                NODE_ENV: 'production', // --env production bilan ishlaganda shu tushadi
                PORT: process.env.PORT || 3000 // .env dan PORT ni oladi, topilmasa 3000
            },

            // --- Logging (Loglarni chiroyli saqlash) ---
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/pm2-error.log', // Xatolar shu faylga yoziladi
            out_file: './logs/pm2-out.log',     // Oddiy console.log lar shu faylga tushadi
            merge_logs: true,
        },
    ],
};
