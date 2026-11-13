import React from 'react';
import { NotificationItem, UserRole } from '../types/database';
import { X, Bell, Check, Calendar, CreditCard, Sparkles, CheckCheck } from 'lucide-react';
import { appStore } from '../services/store';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBooking?: (bookingId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectBooking,
}) => {
  if (!isOpen) return null;

  const state = appStore.getState();
  const roleNotifications = state.notifications.filter(
    (n) => n.recipientRole === state.activeRole
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
      case 'booking_accepted':
        return <Calendar className="w-4 h-4 text-[#D9A441]" />;
      case 'payment_received':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#173D2E]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-stone-200">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-[#FFF8EC]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#173D2E] text-[#D9A441] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#173D2E]">Notifications</h3>
              <span className="text-[10px] text-stone-500 capitalize">
                {state.activeRole} Inbox
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => appStore.markAllNotificationsRead(state.activeRole)}
              className="text-[11px] text-[#173D2E] hover:underline font-bold"
              title="Mark all as read"
            >
              Mark Read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-stone-200 text-stone-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 flex-1 overflow-y-auto divide-y divide-stone-100">
          {roleNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              No notifications yet.
            </div>
          ) : (
            roleNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  appStore.markNotificationAsRead(n.id);
                  if (n.bookingId && onSelectBooking) {
                    onSelectBooking(n.bookingId);
                    onClose();
                  }
                }}
                className={`py-3.5 px-3 rounded-2xl cursor-pointer transition-colors ${
                  !n.read ? 'bg-[#FFF8EC]/60 hover:bg-[#FFF8EC]' : 'hover:bg-stone-50 opacity-80'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-stone-100 rounded-xl mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#173D2E]">{n.title}</h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#D9A441]" />
                      )}
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-stone-400 mt-2 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom bar */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-300"
          >
            Close Notifications
          </button>
        </div>

      </div>
    </div>
  );
};
