import { Link } from 'react-router-dom'
import { Car, Shield, Users, Clock, ArrowRight, Info, Map as MapIcon, Leaf, IndianRupee } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
    const logoLetters = "RYDSET".split("")

    return (
        <div className="space-y-32 pb-32 overflow-x-hidden">
            {/* Bento Hero Section */}
            <section className="relative px-6 pt-12 max-w-[1400px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-rydset-50 rounded-[3.5rem] p-12 md:p-24 relative overflow-hidden"
                >
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-rydset-100/30 blur-3xl -mr-32" />
                    <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-white/20 blur-2xl -ml-20 -mb-20" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="cascading-text text-7xl md:text-[12rem] font-black tracking-tighter text-rydset-600 mb-12 select-none">
                            {logoLetters.map((char, i) => (
                                <span key={i} style={{ animationDelay: `${i * 0.12}s` }} className={i % 2 === 1 ? "text-accent" : ""}>{char}</span>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="max-w-4xl text-center space-y-10"
                        >
                            <h2 className="text-5xl md:text-8xl font-black text-rydset-600 tracking-tight leading-[1.1]">
                                Build the Future of <br />
                                <span className="text-accent">Campus Commute.</span>
                            </h2>
                            <p className="text-xl md:text-2xl text-slate-600 leading-relaxed font-bold max-w-2xl mx-auto">
                                The essential carpooling platform exclusively for the Rajagiri community. Reach campus smarter.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
                                <Link to="/dashboard" className="h-20 px-14 bg-rydset-600 text-white rounded-[2rem] text-xl font-black flex items-center justify-center gap-3 hover:bg-rydset-700 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-rydset-600/10 group">
                                    Start Sharing <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} />
                                </Link>
                                <Link to="/login" className="h-20 px-14 bg-white text-rydset-600 rounded-[2rem] text-xl font-black flex items-center justify-center gap-3 hover:bg-rydset-50 transition-all border-2 border-slate-100 shadow-sm">
                                    Join Community
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* Bento Grid Sections */}
            <section className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* About Card - Large */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-8 bg-white border-2 border-slate-50 rounded-[3.5rem] p-12 md:p-16 shadow-xl shadow-rydset-900/5 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rydset-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative z-10 space-y-8">
                        <div className="inline-flex items-center gap-3 px-6 py-2 bg-rydset-100 text-rydset-700 rounded-full text-sm font-black tracking-widest uppercase">
                            <Info size={18} /> Our Mission
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight tracking-tight">
                            More than just <br /> commuting.
                        </h2>
                        <p className="text-xl md:text-2xl text-slate-500 leading-relaxed font-bold max-w-3xl">
                            RydSET was born to make the daily journey for Rajagiri students and staff smarter, greener, and more connected. We're building a network that values time, cost, and community.
                        </p>
                        <div className="flex gap-12 pt-4">
                            <div>
                                <p className="text-5xl font-black text-accent">100%</p>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 focus:text-rydset-600">Verified RSET Hub</p>
                            </div>
                            <div>
                                <p className="text-5xl font-black text-accent">0%</p>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 focus:text-rydset-600">Emission Waste</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Card - Vertical */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4 bg-rydset-600 text-white rounded-[3.5rem] p-12 flex flex-col justify-between group overflow-hidden"
                >
                    <div className="space-y-6 relative z-10">
                        <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-accent/20 group-hover:scale-110 transition-transform">
                            <Users size={40} className="text-rydset-600" />
                        </div>
                        <h3 className="text-4xl font-black leading-tight">Join the fastest growing campus network.</h3>
                    </div>
                    <Link to="/login" className="mt-12 h-20 bg-accent text-rydset-600 rounded-[2rem] font-black italic text-xl flex items-center justify-center gap-3 hover:bg-white transition-all uppercase tracking-tighter">
                        Join Now <ArrowRight size={24} />
                    </Link>
                </motion.div>

                {/* Feature 1 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-4 bg-rydset-100 text-rydset-600 rounded-[3.5rem] p-12 space-y-8"
                >
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rydset-600 shadow-sm">
                        <Shield size={32} />
                    </div>
                    <h3 className="text-3xl font-black">Strictly Verified</h3>
                    <p className="text-lg font-bold text-rydset-600/70">Exclusive to @rajagiri.edu.in emails with secure OTP booking flow.</p>
                </motion.div>

                {/* Feature 2 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-4 bg-rydset-600 text-white rounded-[3.5rem] p-12 space-y-8 shadow-xl shadow-rydset-600/10"
                >
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-rydset-600 shadow-lg shadow-accent/20">
                        <Leaf size={32} />
                    </div>
                    <h3 className="text-3xl font-black">Eco-Friendly</h3>
                    <p className="text-lg font-bold text-accent/80">Reduce cars on campus and lower the Rajagiri carbon footprint together.</p>
                </motion.div>

                {/* Feature 3 */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-4 bg-white border-2 border-slate-50 rounded-[3.5rem] p-12 space-y-8 shadow-xl shadow-rydset-900/5"
                >
                    <div className="w-16 h-16 bg-rydset-100 rounded-2xl flex items-center justify-center text-rydset-600 shadow-sm">
                        <IndianRupee size={32} />
                    </div>
                    <h3 className="text-3xl font-black text-rydset-600">Dynamic Fares</h3>
                    <p className="text-lg font-bold text-slate-500">Transparent per-KM pricing that's optimized for student budgets.</p>
                </motion.div>
            </section>
        </div>
    )
}
