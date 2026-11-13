import React, { useState } from 'react';
import { X, Phone, MessageSquare, Send, Check } from 'lucide-react';

interface ContactModalProps {
  recipientName: string;
  recipientPhone: string;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  recipientName,
  recipientPhone,
  onClose,
}) => {
  const [message, setMessage] = useState('');
  const [messagesList, setMessagesList] = useState<string[]>([
    'Hello! Regarding the cooking schedule and grocery list.',
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessagesList([...messagesList, message]);
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#173D2E] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#D9A441] text-[#173D2E] font-bold flex items-center justify-center text-sm">
              {recipientName[0]}
            </div>
            <div>
              <h3 className="font-bold text-sm">{recipientName}</h3>
              <p className="text-[11px] text-[#FFF8EC]/70 flex items-center">
                <Phone className="w-3 h-3 mr-1 text-[#D9A441]" />
                {recipientPhone}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="p-4 h-64 overflow-y-auto space-y-3 bg-stone-50 text-xs">
          {messagesList.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl max-w-[85%] ${
                i % 2 === 0
                  ? 'bg-white border border-stone-200 text-stone-800'
                  : 'bg-[#173D2E] text-white ml-auto'
              }`}
            >
              {msg}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type quick message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 p-2.5 rounded-xl border border-stone-200 text-xs font-medium"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-[#173D2E] text-[#FFF8EC] hover:bg-[#0f291e]"
          >
            <Send className="w-4 h-4 text-[#D9A441]" />
          </button>
        </form>

      </div>
    </div>
  );
};
