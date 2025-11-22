import React from 'react';

interface SkillNotificationModalProps {
  isOpen: boolean;
  message: string;
  onAcknowledge: () => void;
}

export const SkillNotificationModal: React.FC<SkillNotificationModalProps> = ({ isOpen, message, onAcknowledge }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm w-full text-center border-2 border-blue-500">
        <h3 className="text-medium font-bold text-blue-400 mb-4">スキル発動！</h3>
        <p className="text-small text-gray-200 mb-6" dangerouslySetInnerHTML={{ __html: message }}></p>
        <button
          onClick={onAcknowledge}
          className="px-6 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg transition"
        >
          OK
        </button>
      </div>
    </div>
  );
};
