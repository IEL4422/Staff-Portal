import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const ActionModal = ({ isOpen, onClose, title, icon: Icon, iconColor = 'bg-[#2E7DA1]', children, maxWidth = 'max-w-2xl' }) => {
  const handleOpenChange = (open) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={`${maxWidth} sm:max-h-[90vh] max-h-[100vh] h-full sm:h-auto overflow-y-auto p-0 sm:rounded-xl rounded-none`}>
        <DialogHeader className="sticky top-0 bg-white z-10 px-4 sm:px-6 py-3 sm:py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {Icon && (
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${iconColor} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              )}
              <DialogTitle className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                {title}
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-9 w-9 sm:h-8 sm:w-8 p-0"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="px-4 sm:px-6 py-4 pb-safe">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActionModal;
