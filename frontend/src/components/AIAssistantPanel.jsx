import React, { useState, useRef, useEffect } from 'react';

const PREDEFINED_RESPONSES = [
  `I've analyzed your project workspace. The files are safely stored in IndexedDB and ready to run locally via the integrated terminal. Would you like me to inspect any specific file?`,
  `To run your development server, use the Terminal panel below or click the ▶ Run button in the top bar. All changes are tracked locally and will upload to Supabase when you press Ctrl+S.`,
  `I noticed you made modifications to the file. Remember to click 'Save' or press Ctrl+S to persist your pending changes to the cloud repository!`,
  `Everything looks clean! The Monaco Editor, IndexedDB local persistence, and local agent are operating synchronously in your workspace.`,
];

export const AIAssistantPanel = ({ isOpen, onClose, projectName = 'Devnest' }) => {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: `Hello! I'm your Devnest AI coding companion (Demo). I can help analyze your code, explain architecture, or guide you through your local workspace.`,
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'msg-2',
      sender: 'user',
      text: `How does Devnest manage files offline?`,
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'msg-3',
      sender: 'assistant',
      text: `Devnest uses **IndexedDB (devnest-db)** as the primary local working storage. All file creation, editing, renaming, and deletion occur locally with zero latency. When you click **Save** or press **Ctrl+S**, your pending changes upload to Supabase Storage.`,
      timestamp: new Date(Date.now() - 1200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Gemini 2.5 Flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isStepsExpanded, setIsStepsExpanded] = useState(true);

  const messagesEndRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = (e) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response after short delay
    setTimeout(() => {
      const randomReply =
        PREDEFINED_RESPONSES[Math.floor(Math.random() * PREDEFINED_RESPONSES.length)];
      const aiReply = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 900);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. How can I assist you with ${projectName} today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleNewConversation = () => {
    handleClearChat();
  };

  return (
    <div className="h-full flex flex-col bg-[#181818] border-l border-[#2b2b2b] select-none text-[#cccccc] font-sans text-xs overflow-hidden">
      {/* Panel Top Header Bar */}
      <div className="h-[35px] flex items-center justify-between px-3 border-b border-[#2b2b2b] bg-[#181818] shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <span className="text-[#38bdf8] font-bold text-sm">✦</span>
          <span className="font-semibold text-white truncate text-[12px]">Devnest AI</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-[#252526] text-[#858585] border border-[#333333]">
            Demo
          </span>
        </div>

        <div className="flex items-center space-x-1 text-[#858585]">
          <button
            onClick={handleNewConversation}
            title="New Conversation"
            className="p-1 hover:text-white hover:bg-[#252526] rounded transition text-xs"
          >
            ＋
          </button>
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            className="p-1 hover:text-white hover:bg-[#252526] rounded transition text-xs"
          >
            🗑
          </button>
          <button
            onClick={onClose}
            title="Close AI Assistant Panel"
            className="p-1 hover:text-white hover:bg-[#252526] rounded transition text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Task Card (Inspired by Screenshot) */}
        <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2b2b2b] shadow-sm text-xs space-y-1">
          <div className="flex items-center justify-between text-[#858585] text-[11px] font-mono">
            <span>ACTIVE TASK</span>
            <span className="text-[#007acc]">IN PROGRESS</span>
          </div>
          <p className="font-semibold text-white text-[12px] truncate">
            {projectName} Workspace Assistant
          </p>
          <p className="text-[#858585] text-[11px] leading-relaxed">
            Local-first file management with Monaco editor & integrated terminal execution.
          </p>
        </div>

        {/* Execution Steps / Log Feed (Matching Screenshot) */}
        <div className="rounded bg-[#1e1e1e] border border-[#2b2b2b] overflow-hidden text-[11px] font-mono">
          <div
            onClick={() => setIsStepsExpanded(!isStepsExpanded)}
            className="px-2.5 py-1.5 bg-[#252526] flex items-center justify-between text-[#858585] hover:text-[#cccccc] cursor-pointer select-none"
          >
            <div className="flex items-center space-x-1.5">
              <span>{isStepsExpanded ? '▾' : '▸'}</span>
              <span className="font-semibold uppercase tracking-wider text-[10px]">Recent Activity</span>
            </div>
            <span className="text-[10px] text-emerald-400">Ready</span>
          </div>

          {isStepsExpanded && (
            <div className="p-2 space-y-1 text-[#858585] leading-tight">
              <div className="flex items-center space-x-1 text-[#cccccc]">
                <span>✓</span>
                <span className="truncate">IndexedDB devnest-db initialized</span>
              </div>
              <div className="flex items-center space-x-1 text-[#858585]">
                <span>•</span>
                <span className="truncate">Local agent workspace connected</span>
              </div>
              <div className="flex items-center space-x-1 text-[#858585]">
                <span>•</span>
                <span className="truncate">Monaco editor view state mounted</span>
              </div>
              <div className="flex items-center space-x-1 text-[#38bdf8] animate-pulse">
                <span>⚡</span>
                <span className="truncate">Devnest Assistant standing by...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat History */}
        <div className="space-y-3 pt-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1 ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center space-x-1.5 text-[10px] text-[#666666] px-1">
                <span>{msg.sender === 'user' ? 'You' : 'Devnest AI'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[90%] rounded-lg p-2.5 text-xs leading-relaxed select-text ${
                  msg.sender === 'user'
                    ? 'bg-[#007acc] text-white shadow-sm'
                    : 'bg-[#252526] border border-[#2b2b2b] text-[#cccccc]'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center space-x-2 text-[#858585] text-xs px-2 py-1">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
              <span className="italic">Devnest AI is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Message Input Area (Matching Screenshot) */}
      <div className="p-2.5 bg-[#181818] border-t border-[#2b2b2b] shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="rounded-lg bg-[#1e1e1e] border border-[#333333] focus-within:border-[#007acc] transition p-2 space-y-2"
        >
          {/* Text Input */}
          <textarea
            rows="2"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask anything, @ to mention, / for actions"
            className="w-full bg-transparent resize-none outline-none text-xs text-white placeholder-[#666666] leading-relaxed"
          />

          {/* Bottom Bar: Attachment, Model Selector, Send Button */}
          <div className="flex items-center justify-between pt-1 border-t border-[#2b2b2b]/60">
            <div className="flex items-center space-x-1.5 relative">
              {/* Attachment Icon (Demo) */}
              <button
                type="button"
                title="Add attachment / context (Demo)"
                className="p-1 text-[#858585] hover:text-[#cccccc] hover:bg-[#252526] rounded transition text-xs"
              >
                ＋
              </button>

              {/* Model Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#252526] hover:bg-[#2d2d2d] text-[#cccccc] text-[10px] font-mono transition"
                >
                  <span>{selectedModel}</span>
                  <span className="text-[8px] text-[#858585]">▾</span>
                </button>

                {isModelDropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-1 w-40 py-1 bg-[#252526] border border-[#333333] rounded shadow-2xl z-50 text-[11px] font-sans">
                    {['Gemini 2.5 Flash', 'Claude 3.7 Sonnet', 'Devnest Demo LLM'].map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1 hover:bg-[#007acc] hover:text-white transition ${
                          selectedModel === model ? 'font-semibold text-white' : 'text-[#858585]'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className={`p-1.5 rounded transition ${
                inputValue.trim() && !isTyping
                  ? 'bg-[#007acc] hover:bg-[#0062a3] text-white shadow-sm'
                  : 'bg-[#252526] text-[#555555] cursor-not-allowed'
              }`}
              title="Send Message (Enter)"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

