import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const ActionModal = ({ isOpen, onClose, title, icon: Icon, iconColor = 'bg-[#2E7DA1]', children, maxWidth = 'max-w-2xl' }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${maxWidth} max-h-[90vh] overflow-y-auto p-0`}>
        <DialogHeader className="sticky top-0 bg-white z-10 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={`w-10 h-10 ${iconColor} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              )}
              <DialogTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                {title}
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onClose(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="px-6 py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActionModal;
