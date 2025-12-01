import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import imgLogo from '../../assets/images/common/logo.png';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantColors = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600',
      border: 'border-red-600',
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'text-yellow-600',
      border: 'border-yellow-600',
    },
    info: {
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      icon: 'text-emerald-600',
      border: 'border-emerald-600',
    },
  };

  const colors = variantColors[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all border-2 border-primary">
          {/* Header with Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary rounded-t-lg">
            <div className="flex items-center space-x-3">
              <img src={imgLogo} alt="Logo" className="h-8 w-auto" />
              <h3 className="text-lg font-semibold text-white">
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 ${colors.icon}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">{message}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${colors.button} ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

