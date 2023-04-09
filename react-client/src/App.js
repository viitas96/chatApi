import React from 'react'
import {ToastProvider} from 'react-toast-notifications';
import ChatRoom from './components/ChatRoom'

const App = () => {
    return (
        <ToastProvider>
            <ChatRoom/>
        </ToastProvider>
    )
}

export default App;

