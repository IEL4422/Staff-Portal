import React, { createContext, useContext, useState } from 'react';

const ActionModalsContext = createContext();

export const useActionModals = () => {
  const context = useContext(ActionModalsContext);
  if (!context) {
    throw new Error('useActionModals must be used within ActionModalsProvider');
  }
  return context;
};

export const ActionModalsProvider = ({ children }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [modalProps, setModalProps] = useState({});

  const openModal = (modalName, props = {}) => {
    setActiveModal(modalName);
    setModalProps(props);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalProps({});
  };

  return (
    <ActionModalsContext.Provider value={{ activeModal, modalProps, openModal, closeModal }}>
      {children}
    </ActionModalsContext.Provider>
  );
};
