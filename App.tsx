
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Agent, SharedState, LogEntry, AGENT_COLORS, AGENT_ICONS } from './types';
import { callAgent } from './services/geminiService';

const INITIAL_STATE: SharedState = {
  topic: '',
  difficulty: 'Beginner',
  lessonPlan: null,
  explanation: null,
  quiz: null,
  studentAnswers: null,
  feedback: null,
  motivatorMessage: null,
  reviewerApproved: null,
  reviewerComments: null,
  confidence: 0,
  turnCount: 0,
  maxTurns: 15,
};

export default function App() {
  const [state, setState] = useState<SharedState>(INITIAL_STATE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [difficultyInput, setDifficultyInput] = useState('Beginner');
  const [humanInput, setHumanInput] = useState('');
  const [showHumanPrompt, setShowHumanPrompt] = useState(false);
  const [currentStep, setCurrentStep] = useState<Agent | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((agent: Agent, content: string, type: LogEntry['type'], reason?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      agent,
      content,
      type,
      reason,
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const determineNextAgent = (s: SharedState): Agent => {
    if (s.turnCount >= s.maxTurns) return Agent.END;
    if (!s.lessonPlan) return Agent.CURRICULUM_PLANNER;
    if (!s.explanation) return Agent.CONCEPT_EXPLAINER;
    if (!s.quiz) return Agent.QUIZ_GENERATOR;
    
    // Logic for student interactions
    if (s.quiz && !s.studentAnswers) return Agent.HUMAN_APPROVAL; // Wait for student answers
    if (s.studentAnswers && !s.feedback) return Agent.FEEDBACK_ANALYZER;
    if (s.feedback && !s.motivatorMessage) return Agent.MOTIVATOR;
    
    // Quality check
    if (s.motivatorMessage && s.reviewerApproved === null) return Agent.QUALITY_REVIEWER;
    
    // Termination condition
    if (s.reviewerApproved && s.confidence >= 0.8) return Agent.END;
    
    // If not approved, or low confidence, we might need human intervention or loop back
    if (s.reviewerApproved === false) return Agent.HUMAN_APPROVAL;

    return Agent.END;
  };

  const runStep = async (targetAgent: Agent, currentState: SharedState) => {
    setIsProcessing(true);
    setCurrentStep(targetAgent);
    addLog(targetAgent, `Agent ${targetAgent} starting...`, 'status');

    try {
      const output = await callAgent(targetAgent, currentState);
      let updatedState = { ...currentState, turnCount: currentState.turnCount + 1 };

      switch (targetAgent) {
        case Agent.CURRICULUM_PLANNER:
          updatedState.lessonPlan = output;
          break;
        case Agent.CONCEPT_EXPLAINER:
          updatedState.explanation = output;
          break;
        case Agent.QUIZ_GENERATOR:
          updatedState.quiz = output;
          break;
        case Agent.FEEDBACK_ANALYZER:
          updatedState.feedback = output;
          break;
        case Agent.MOTIVATOR:
          updatedState.motivatorMessage = output;
          break;
        case Agent.QUALITY_REVIEWER:
          const review = JSON.parse(output);
          updatedState.reviewerApproved = review.approved;
          updatedState.reviewerComments = review.comments;
          updatedState.confidence = review.confidence;
          break;
      }

      addLog(targetAgent, output, 'output');
      setState(updatedState);
      
      // Auto-decide next step unless it's a human approval step
      const next = determineNextAgent(updatedState);
      if (next === Agent.HUMAN_APPROVAL) {
        setShowHumanPrompt(true);
        addLog(Agent.SUPERVISOR, "Awaiting human intervention.", 'decision', "Human input required for student answers or system adjustment.");
      } else if (next !== Agent.END) {
        // Recurse for next agent if not human/end
        setTimeout(() => runStep(next, updatedState), 800);
      } else {
        addLog(Agent.END, "Learning objective reached or max turns exceeded.", 'status');
      }

    } catch (err) {
      addLog(targetAgent, "Execution failed.", 'error');
    } finally {
      setIsProcessing(false);
      setCurrentStep(null);
    }
  };

  const startSession = () => {
    if (!topicInput) return;
    const s = { ...INITIAL_STATE, topic: topicInput, difficulty: difficultyInput };
    setState(s);
    setLogs([]);
    addLog(Agent.SUPERVISOR, `Initializing session for: ${topicInput} (${difficultyInput})`, 'status');
    runStep(Agent.CURRICULUM_PLANNER, s);
  };

  const handleHumanSubmit = () => {
    if (!humanInput) return;
    setShowHumanPrompt(false);
    
    let updatedState = { ...state };
    if (state.quiz && !state.studentAnswers) {
      // Human acts as student
      updatedState.studentAnswers = humanInput;
      addLog(Agent.HUMAN_APPROVAL, `Student Answer: ${humanInput}`, 'output');
    } else {
      // Human acts as supervisor adjustment
      addLog(Agent.HUMAN_APPROVAL, `Human feedback: ${humanInput}`, 'output');
      // Reset parts of state if needed based on feedback (simplified)
    }

    setHumanInput('');
    setState(updatedState);
    const next = determineNextAgent(updatedState);
    runStep(next, updatedState);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">
      {/* Sidebar / Configuration */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col p-6 overflow-y-auto shrink-0">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <i className="fas fa-microchip text-indigo-400"></i>
          Nexus Tutor
        </h1>
        <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest">Multi-Agent Orchestrator</p>

        <div className="space-y-6">
          <section>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Topic</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Photosynthesis"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              disabled={state.turnCount > 0 && state.reviewerApproved !== true}
            />
          </section>

          <section>
            <label className="block text-sm font-semibold mb-2 text-slate-300">Difficulty</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              value={difficultyInput}
              onChange={(e) => setDifficultyInput(e.target.value)}
              disabled={state.turnCount > 0 && state.reviewerApproved !== true}
            >
              <option>Toddler</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>Expert</option>
            </select>
          </section>

          <button
            onClick={startSession}
            disabled={isProcessing || !topicInput}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-lg ${
              isProcessing || !topicInput ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40'
            }`}
          >
            {isProcessing ? 'SYSTEM BUSY...' : 'START TUTORING'}
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-700">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-widest font-bold">System Status</div>
          <div className="space-y-2">
            <StatusRow label="Turn Count" value={`${state.turnCount}/${state.maxTurns}`} />
            <StatusRow label="Confidence" value={`${(state.confidence * 100).toFixed(1)}%`} />
            <StatusRow label="Current Agent" value={currentStep || 'IDLE'} />
          </div>
        </div>
      </div>

      {/* Main Activity Log */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-800/50 backdrop-blur flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">
              SESSION_ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}
            </span>
          </div>
          <div className="flex gap-2">
            {Object.values(Agent).map(a => (
              <div
                key={a}
                title={a}
                className={`w-3 h-3 rounded-full ${currentStep === a ? AGENT_COLORS[a] + ' animate-pulse' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-6" ref={scrollRef}>
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <i className="fas fa-terminal text-6xl opacity-10"></i>
              <p>Ready to initialize agent swarm. Set a topic to begin.</p>
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white shadow-lg ${AGENT_COLORS[log.agent]}`}>
                  <i className={`fas ${AGENT_ICONS[log.agent]}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-100">{log.agent.replace('_', ' ')}</span>
                    <span className="text-[10px] font-mono text-slate-500">{log.timestamp.toLocaleTimeString()}</span>
                    {log.type === 'decision' && (
                       <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-800 font-medium">DECISION</span>
                    )}
                  </div>
                  {log.reason && <p className="text-xs text-indigo-400 italic mb-2">Reason: {log.reason}</p>}
                  <div className={`p-4 rounded-xl text-sm leading-relaxed border ${
                    log.type === 'error' ? 'bg-red-900/20 border-red-800/50 text-red-200' :
                    log.type === 'status' ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 italic' :
                    'bg-slate-800 border-slate-700 text-slate-200 shadow-xl'
                  }`}>
                    <div className="whitespace-pre-wrap">
                      {log.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </main>

        {/* Input area for Human Approval / Student Answer */}
        {showHumanPrompt && (
          <div className="p-6 bg-slate-800 border-t border-slate-700 shadow-2xl relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
              Human Intervention Required
            </div>
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
               <div className="text-xs text-slate-400 text-center">
                 {state.quiz && !state.studentAnswers 
                   ? "You are currently the STUDENT. Please answer the quiz questions generated by the AI." 
                   : "The system requires review. Provide feedback or override instructions."}
               </div>
               <div className="flex gap-4">
                <textarea
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none min-h-[100px] resize-none"
                  placeholder={state.quiz && !state.studentAnswers ? "Enter your quiz answers here..." : "Provide guidance to the supervisor..."}
                  value={humanInput}
                  onChange={(e) => setHumanInput(e.target.value)}
                />
                <button
                  onClick={handleHumanSubmit}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 rounded-xl transition-colors shrink-0"
                >
                  SUBMIT
                </button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Visualizer for Artifacts */}
      <div className="w-96 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Current Knowledge Base</h2>
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <ArtifactCard title="Curriculum Plan" content={state.lessonPlan} icon="fa-map" color="text-indigo-400" />
          <ArtifactCard title="Explanation" content={state.explanation} icon="fa-chalkboard-user" color="text-emerald-400" />
          <ArtifactCard title="Quiz" content={state.quiz} icon="fa-question-circle" color="text-amber-400" />
          <ArtifactCard title="Assessment & Feedback" content={state.feedback} icon="fa-magnifying-glass-chart" color="text-rose-400" />
          <ArtifactCard title="Motivation" content={state.motivatorMessage} icon="fa-fire" color="text-cyan-400" />
          
          {state.reviewerComments && (
            <div className={`p-4 rounded-xl border ${state.reviewerApproved ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-red-900/10 border-red-800/50'}`}>
              <h3 className="text-xs font-bold uppercase mb-2 flex items-center gap-2">
                <i className={`fas ${state.reviewerApproved ? 'fa-check-circle text-emerald-500' : 'fa-times-circle text-red-500'}`}></i>
                Reviewer Report
              </h3>
              <p className="text-xs text-slate-300 italic">{state.reviewerComments}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string | Agent }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-mono truncate max-w-[120px]" title={value.toString()}>{value.toString().replace('_', ' ')}</span>
    </div>
  );
}

function ArtifactCard({ title, content, icon, color }: { title: string; content: string | null; icon: string; color: string }) {
  if (!content) {
    return (
      <div className="border border-dashed border-slate-800 p-4 rounded-xl text-center opacity-40">
        <i className={`fas ${icon} text-lg mb-2 block`}></i>
        <span className="text-[10px] font-bold uppercase tracking-tight">{title} (PENDING)</span>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="flex items-center gap-2 mb-2">
        <i className={`fas ${icon} text-xs ${color}`}></i>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-xs text-slate-400 line-clamp-6 group-hover:line-clamp-none transition-all duration-300 overflow-hidden relative">
        <div className="whitespace-pre-wrap">{content}</div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900/80 to-transparent group-hover:opacity-0 transition-opacity"></div>
      </div>
    </div>
  );
}
