import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const AiChatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { id: 1, sender: 'ai', text: `Hello ${user?.full_name?.split(' ')[0] || 'there'}, I am the SentinelX AI Analyst. How can I help you overview the situation today?` }
      ]);
    }
  }, [isOpen, messages.length, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat', { message: text });
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: response.data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: "I'm having trouble connecting to the intelligence core right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    handleSend(action);
  };

  if (!user || user.role?.role_name === 'reporter') return null; // Restrict to admin/analysts

  return (
    <>
      <div 
        className={`ai-chatbot-fab ${isOpen ? 'hidden' : ''}`} 
        onClick={() => setIsOpen(true)}
        title="Open AI Analyst"
      >
        <span className="material-icons">psychology</span>
      </div>

      <div className={`ai-chatbot-window card-glass ${isOpen ? 'open' : ''}`}>
        <div className="ai-chatbot-header card-header-custom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-icons" style={{ color: '#00f5ff' }}>psychology</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'Orbitron', fontWeight: 'bold', fontSize: '1rem', color: '#fff' }}>SentinelX AI Analyst</span>
              <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Online
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsOpen(false)}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="ai-chatbot-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`ai-msg-row ${msg.sender}`}>
              {msg.sender === 'ai' && <div className="ai-avatar"><span className="material-icons">psychology</span></div>}
              <div className={`ai-bubble ${msg.sender}`}>
                {msg.text.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="ai-msg-row ai">
              <div className="ai-avatar"><span className="material-icons">psychology</span></div>
              <div className="ai-bubble ai typing">
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length < 3 && !isTyping && (
          <div className="ai-quick-actions">
            <button onClick={() => handleQuickAction("Give me a dashboard overview")}>Overview</button>
            <button onClick={() => handleQuickAction("What are the critical incidents?")}>Critical Incidents</button>
            <button onClick={() => handleQuickAction("Summarize current threat intel")}>Threat Intel</button>
          </div>
        )}

        <div className="ai-chatbot-input">
          <input 
            type="text" 
            placeholder="Ask the AI Analyst..." 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend(input)}
          />
          <button className="btn-primary" onClick={() => handleSend(input)} disabled={isTyping || !input.trim()}>
            <span className="material-icons">send</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AiChatbot;
