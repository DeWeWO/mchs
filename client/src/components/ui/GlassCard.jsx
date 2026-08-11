// src/components/ui/GlassCard.jsx
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function GlassCard({ children, className, title, icon: Icon, delay = 0, ...props }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay }}
            {...props}
            className={clsx(
                "glass-panel rounded-2xl p-6 relative overflow-hidden group", // Базовые стили
                "hover:border-white/20 transition-colors duration-300", // Ховер эффект
                className
            )}
        >
            {/* Если передан заголовок и иконка */}
            {(title || Icon) && (
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    {Icon && <Icon className="text-brand-blue" size={20} />}
                    <h3 className="font-semibold text-slate-200 tracking-wide text-sm uppercase">{title}</h3>
                </div>
            )}

            {/* Светящийся эффект при наведении */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {children}
        </motion.div>
    );
}
