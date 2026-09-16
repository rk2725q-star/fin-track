import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Mic, MicOff, Volume2, VolumeX, X, Bot, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardData, Customer, Loan, Expense } from '../types';

interface ChatbotProps {
  dashboard: DashboardData | null;
  customers: Customer[];
  loans: Loan[];
  expenses: Expense[];
  setActiveTab: (tab: any) => void;
}

export default function Chatbot({ dashboard, customers, loans, expenses, setActiveTab }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "வணக்கம்! நான் உங்கள் நிதி உதவியாளர். நான் உங்களுக்கு எப்படி உதவ முடியும்? (Hello! I'm your finance assistant. How can I help you today?)", isBot: true }
  ]);

  const handleToggle = () => {
    // Prime speech synthesis on first interaction
    if (!isOpen) {
      const utterance = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(utterance);
    }

    if (isOpen && !isMinimized) {
      setIsOpen(false);
    } else {
      if (messages.length > 1 && !isMinimized) {
        setMessages(prev => [...prev, { text: "மீண்டும் வருக! நான் உங்களுக்கு எப்படி உதவ முடியும்? (Welcome back! How can I help you now?)", isBot: true }]);
      }
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speak = (text: string) => {
    if (!isTtsEnabled) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      // Look for Tamil voices (ta-IN, ta-LK, etc.)
      const tamilVoice = voices.find(v => 
        v.lang.toLowerCase().includes('ta-in') || 
        v.lang.toLowerCase().includes('ta_in') ||
        v.lang.toLowerCase() === 'ta' ||
        v.name.toLowerCase().includes('tamil')
      );
      
      utterance.lang = 'ta-IN';
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }
      utterance.rate = 0.9; 
      utterance.pitch = 1;
      
      // Use a small delay for better reliability
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 10);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
    } else {
      setVoiceAndSpeak();
    }
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { text, isBot: false }];
    setMessages(newMessages);
    setInput('');

    // Automated Logic (No AI/API)
    const response = generateResponse(text.toLowerCase());
    setTimeout(() => {
      setMessages(prev => [...prev, { text: response, isBot: true }]);
      speak(response);
    }, 500);
  };

  const generateResponse = (query: string): string => {
    if (query.includes('வணக்கம்') || query.includes('hello') || query.includes('hi')) {
      return "வணக்கம்! இன்று நான் உங்களுக்கு என்ன தகவல் தர வேண்டும்? (Hello! What information can I provide you today?)";
    }

    // Navigation Commands
    if (query.includes('வாடிக்கையாளர் பட்டியல்') || query.includes('show customers') || query.includes('customers list')) {
      setActiveTab('customers');
      return "நிச்சயமாக! இதோ உங்கள் வாடிக்கையாளர் பட்டியல். (Sure! Here is your customer list.)";
    }

    if (query.includes('கடன் பட்டியல்') || query.includes('show loans') || query.includes('loans list')) {
      setActiveTab('loans');
      return "நிச்சயமாக! இதோ உங்கள் கடன் பட்டியல். (Sure! Here is your loans list.)";
    }

    if (query.includes('செலவு பட்டியல்') || query.includes('show expenses') || query.includes('expenses list')) {
      setActiveTab('expenses');
      return "நிச்சயமாக! இதோ உங்கள் செலவு பட்டியல். (Sure! Here is your expenses list.)";
    }

    if (query.includes('டேஷ்போர்டு') || query.includes('dashboard') || query.includes('home')) {
      setActiveTab('dashboard');
      return "நிச்சயமாக! இதோ உங்கள் டேஷ்போர்டு. (Sure! Here is your dashboard.)";
    }

    if (query.includes('ரொக்கப் புத்தகம்') || query.includes('cashbook')) {
      setActiveTab('cashbook');
      return "நிச்சயமாக! இதோ உங்கள் ரொக்கப் புத்தகம். (Sure! Here is your cashbook.)";
    }

    if (query.includes('அமைப்புகள்') || query.includes('settings')) {
      setActiveTab('settings');
      return "நிச்சயமாக! இதோ உங்கள் அமைப்புகள். (Sure! Here is your settings.)";
    }

    // Data Queries
    if (query.includes('மொத்த வசூல்') || query.includes('total collection') || query.includes('collected')) {
      return `மொத்த வசூல் ₹${(dashboard?.overall?.total_collected || 0).toLocaleString()}. இன்று வசூலிக்கப்பட்டது ₹${(dashboard?.period?.collected || 0).toLocaleString()}.`;
    }

    if (query.includes('பாக்கி') || query.includes('pending') || query.includes('balance')) {
      return `மொத்த நிலுவையில் உள்ள தொகை ₹${(dashboard?.overall?.total_pending || 0).toLocaleString()}.`;
    }

    if (query.includes('வாடிக்கையாளர்') || query.includes('customer')) {
      const activeCount = customers.length;
      return `உங்களிடம் மொத்தம் ${activeCount} வாடிக்கையாளர்கள் உள்ளனர். (You have ${activeCount} total customers.)`;
    }

    if (query.includes('கடன்') || query.includes('loan')) {
      const activeLoans = loans.filter(l => l.status === 'active').length;
      return `தற்போது ${activeLoans} கடன்கள் செயல்பாட்டில் உள்ளன. (Currently ${activeLoans} loans are active.)`;
    }

    if (query.includes('செலவு') || query.includes('expense')) {
      return `இன்றைய செலவு ₹${(dashboard?.period?.expenses || 0).toLocaleString()}.`;
    }

    if (query.includes('லாபம்') || query.includes('profit')) {
      return `எதிர்பார்க்கப்படும் லாபம் ₹${(dashboard?.overall?.total_profit_potential || 0).toLocaleString()}.`;
    }

    // Search for specific customer
    const foundCustomer = customers.find(c => query.includes(c.name.toLowerCase()));
    if (foundCustomer) {
      const customerLoans = loans.filter(l => l.customer_id === foundCustomer.id && l.status === 'active');
      let baseInfo = `${foundCustomer.name} ஒரு ${foundCustomer.preferred_frequency === 'daily' ? 'தினசரி' : foundCustomer.preferred_frequency === 'weekly' ? 'வாராந்திர' : 'மாதாந்திர'} வாடிக்கையாளர்.`;
      if (foundCustomer.preferred_frequency !== 'monthly') {
        baseInfo += ` அவர் ${foundCustomer.preferred_day === 'all' ? 'அனைத்து நாட்களிலும்' : foundCustomer.preferred_day + ' அன்று'} பணம் செலுத்துவார்.`;
      }
      
      if (customerLoans.length > 0) {
        return `${baseInfo} தற்போது ₹${(customerLoans[0].balance || 0).toLocaleString()} பாக்கி உள்ளது.`;
      }
      return `${baseInfo} தற்போது செயல்பாட்டில் உள்ள கடன்கள் இல்லை.`;
    }

    return "மன்னிக்கவும், நீங்கள் கேட்டது எனக்கு புரியவில்லை. வசூல், பாக்கி, செலவு அல்லது வாடிக்கையாளர் பற்றி கேளுங்கள். (Sorry, I didn't understand. Ask about collections, pending, expenses, or customers.)";
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("உங்கள் உலாவி குரல் அங்கீகாரத்தை ஆதரிக்கவில்லை. (Your browser does not support speech recognition.)");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ta-IN'; // Default to Tamil
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. தயவுசெய்து உங்கள் உலாவி அமைப்புகளில் மைக்ரோஃபோனை அனுமதிக்கவும். (Microphone permission denied. Please allow microphone access in your browser settings.)");
      } else if (event.error === 'no-speech') {
        // Ignore no-speech errors as they are common
      } else {
        alert(`குரல் அங்கீகார பிழை: ${event.error} (Speech recognition error: ${event.error})`);
      }
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };
    recognition.start();
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={handleToggle}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-0 right-0 sm:bottom-24 sm:right-6 w-full sm:w-96 h-full sm:h-[500px] bg-white rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">நிதி உதவியாளர் (Finance Bot)</h4>
                  <p className="text-[10px] opacity-80 uppercase tracking-widest">Automated Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors sm:block hidden"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors relative z-50"
                  aria-label="Close Chat"
                >
                  <X className="w-6 h-6 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.isBot 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                      : 'bg-indigo-600 text-white shadow-md'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex gap-2">
                <button 
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition-colors ${isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                  placeholder="இங்கே கேளுங்கள்... (Ask here...)"
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button 
                  onClick={() => handleSend(input)}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
