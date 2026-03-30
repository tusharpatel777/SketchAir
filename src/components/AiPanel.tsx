import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Eye, Trophy, Flame, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { analyzeDrawing, generateChallenge, judgeDrawing, roastDrawing } from '@/src/lib/gemini';

function parseError(e: any): string {
  const msg: string = e?.message ?? String(e);
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('quota')) {
    return 'AI service limit reached. Please wait a minute and try again.';
  }
  if (msg.includes('GEMINI_API_KEY')) return msg;
  if (msg.includes('API_KEY_INVALID') || msg.includes('403')) {
    return 'Invalid API key. Check your .env file and restart the dev server.';
  }
  return 'Something went wrong. Check the console for details.';
}

type Tab = 'analyze' | 'challenge' | 'roast';
type ChallengeState = 'idle' | 'playing' | 'judging' | 'result';

const TIMER_SECONDS = 60;

export default function AiPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('analyze');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Challenge state
  const [challengeState, setChallengeState] = useState<ChallengeState>('idle');
  const [challengeWord, setChallengeWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [judgeResult, setJudgeResult] = useState<{ score: number; feedback: string; emoji: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const startTimer = () => {
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          handleJudge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const text = await analyzeDrawing();
      setResult(text);
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleStartChallenge = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setJudgeResult(null);
    try {
      const word = await generateChallenge();
      setChallengeWord(word);
      setChallengeState('playing');
      startTimer();
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleJudge = async () => {
    stopTimer();
    setChallengeState('judging');
    try {
      const result = await judgeDrawing(challengeWord);
      setJudgeResult(result);
      setChallengeState('result');
    } catch (e: any) {
      setError(parseError(e));
      setChallengeState('idle');
    }
  };

  const handleReset = () => {
    stopTimer();
    setChallengeState('idle');
    setChallengeWord('');
    setJudgeResult(null);
    setResult(null);
    setError(null);
  };

  const handleRoast = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const text = await roastDrawing();
      setResult(text);
    } catch (e: any) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  };

  const timerColor = timeLeft > 30 ? 'text-green-400' : timeLeft > 10 ? 'text-yellow-400' : 'text-red-400 animate-pulse';
  const timerBg = timeLeft > 30 ? 'bg-green-500' : timeLeft > 10 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-80 sm:w-96 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-orange-500/10 to-purple-500/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <span className="font-black text-sm uppercase tracking-widest text-white">AI Studio</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {([
                { id: 'analyze', label: 'Analyze', icon: Eye },
                { id: 'challenge', label: 'Challenge', icon: Trophy },
                { id: 'roast', label: 'Roast Me', icon: Flame },
              ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setResult(null); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${
                    tab === id
                      ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/5'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-5">

              {/* ANALYZE TAB */}
              {tab === 'analyze' && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Our AI will look at your drawing and tell you what it sees — get ready for creative interpretations!
                  </p>
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    {loading ? 'Analyzing your drawing...' : 'What did I draw?'}
                  </button>

                  <AnimatePresence>
                    {result && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-800/60 border border-white/5 rounded-2xl p-4"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xl mt-0.5">🤖</span>
                          <p className="text-sm text-zinc-200 leading-relaxed">{result}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* CHALLENGE TAB */}
              {tab === 'challenge' && (
                <div className="flex flex-col gap-4">

                  {challengeState === 'idle' && (
                    <>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Get a secret word, draw it in 60 seconds using hand gestures, then our AI judges your art!
                      </p>
                      <button
                        onClick={handleStartChallenge}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                        {loading ? 'Getting your challenge...' : 'Start Challenge!'}
                      </button>
                    </>
                  )}

                  {challengeState === 'playing' && (
                    <>
                      {/* Word to draw */}
                      <div className="text-center bg-zinc-800/60 border border-orange-500/20 rounded-2xl p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Draw this:</p>
                        <p className="text-3xl font-black text-white uppercase tracking-tight">{challengeWord}</p>
                      </div>

                      {/* Timer */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${timerBg} rounded-full`}
                            animate={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className={`font-mono font-black text-lg w-10 text-right ${timerColor}`}>
                          {timeLeft}s
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleJudge}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-2xl transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Done! Judge it
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}

                  {challengeState === 'judging' && (
                    <div className="text-center py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-3" />
                      <p className="text-sm text-zinc-400">AI is judging your masterpiece...</p>
                    </div>
                  )}

                  {challengeState === 'result' && judgeResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col gap-4"
                    >
                      {/* Score */}
                      <div className="text-center bg-zinc-800/60 border border-white/5 rounded-2xl p-5">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">You drew: <span className="text-white font-bold">{challengeWord}</span></p>
                        <div className="text-5xl mb-2">{judgeResult.emoji}</div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-black text-orange-400">{judgeResult.score}</span>
                          <span className="text-xl text-zinc-500 font-bold">/10</span>
                        </div>
                        {/* Stars */}
                        <div className="flex justify-center gap-1 mt-2">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} className={`text-sm ${i < judgeResult.score ? 'text-yellow-400' : 'text-zinc-700'}`}>★</span>
                          ))}
                        </div>
                      </div>

                      {/* Feedback */}
                      <div className="bg-zinc-800/40 border border-white/5 rounded-2xl p-4">
                        <p className="text-sm text-zinc-200 leading-relaxed">{judgeResult.feedback}</p>
                      </div>

                      <button
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-2xl transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Another Challenge
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ROAST TAB */}
              {tab === 'roast' && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Brace yourself — our AI will hilariously roast your drawing. It ends with a tiny compliment. Maybe. 🔥
                  </p>
                  <button
                    onClick={handleRoast}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-red-500/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                    {loading ? 'Cooking up a roast...' : 'Roast My Drawing 🔥'}
                  </button>

                  <AnimatePresence>
                    {result && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-950/30 border border-red-500/20 rounded-2xl p-4"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xl mt-0.5">🔥</span>
                          <p className="text-sm text-zinc-200 leading-relaxed">{result}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
                >
                  <p className="text-xs text-red-400">{error}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? 'bg-zinc-800 text-zinc-400 border border-white/10'
            : 'bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-orange-500/30'
        }`}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
