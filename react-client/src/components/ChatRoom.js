import React, {useEffect, useState} from 'react'
import {ToastProvider, useToasts} from 'react-toast-notifications';
import {over} from 'stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';

let stompClient = null;
const ChatRoom = () => {
    const {addToast} = useToasts();
    const [privateChats, setPrivateChats] = useState(new Map());
    const [publicChats, setPublicChats] = useState([]);
    const [tab, setTab] = useState("CHATROOM");
    const [userData, setUserData] = useState({
        username: '',
        password: '',
        nickName: '',
        token: '',
        receivername: '',
        connected: false,
        message: ''
    });
    useEffect(() => {
        console.log(userData);
    }, [userData]);

    const connect = () => {
        let data = {
            email: userData.username,
            password: userData.password,
        };

        axios
            .post('http://localhost:8081/api/auth/login', data)
            .then((response) => {
               initializeConnection();
            })
            .catch((error) => {
                console.log(error)
                addToast(error.response.data.error, {appearance: 'error', autoDismiss: true});
            });
    };

    const createAccount = () => {
        let data = {
            email: userData.username,
            password: userData.password,
            nickName: userData.nickName
        };

        axios
            .post('http://localhost:8081/api/auth/register', data)
            .then((response) => {
                initializeConnection();
            })
            .catch((error) => {
                console.log(error)
                addToast(error.response.data.error, {appearance: 'error', autoDismiss: true});
            });
    };

    const initializeConnection = () => {
        let Sock = new SockJS('http://localhost:8080/ws');
        stompClient = over(Sock);
        stompClient.connect({}, onConnected, onError);
        addToast('Connected', {appearance: 'success', autoDismiss: true});
    }


    const onConnected = () => {
        setUserData({...userData, "connected": true});
        stompClient.subscribe('/chatroom/public', onMessageReceived);
        stompClient.subscribe('/user/' + userData.username + '/private', onPrivateMessage);
        userJoin();
    }

    const userJoin = () => {
        let chatMessage = {
            senderName: userData.username,
            status: "JOIN"
        };
        stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
    }

    const onMessageReceived = (payload) => {
        let payloadData = JSON.parse(payload.body);
        switch (payloadData.status) {
            case "JOIN":
                if (!privateChats.get(payloadData.senderName)) {
                    privateChats.set(payloadData.senderName, []);
                    setPrivateChats(new Map(privateChats));
                }
                break;
            case "MESSAGE":
                publicChats.push(payloadData);
                setPublicChats([...publicChats]);
                break;
        }
    }

    const onPrivateMessage = (payload) => {
        console.log(payload);
        let payloadData = JSON.parse(payload.body);
        if (privateChats.get(payloadData.senderName)) {
            privateChats.get(payloadData.senderName).push(payloadData);
            setPrivateChats(new Map(privateChats));
        } else {
            let list = [];
            list.push(payloadData);
            privateChats.set(payloadData.senderName, list);
            setPrivateChats(new Map(privateChats));
        }
    }

    const onError = (err) => {
        console.log(err);

    }

    const handleMessage = (event) => {
        const {value} = event.target;
        setUserData({...userData, "message": value});
    }
    const sendValue = () => {
        if (stompClient) {
            let chatMessage = {
                senderName: userData.username,
                message: userData.message,
                status: "MESSAGE"
            };
            console.log(chatMessage);
            stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
            setUserData({...userData, "message": ""});
        }
    }

    const sendPrivateValue = () => {
        if (stompClient) {
            let chatMessage = {
                senderName: userData.username,
                receiverName: tab,
                message: userData.message,
                status: "MESSAGE"
            };

            if (userData.username !== tab) {
                privateChats.get(tab).push(chatMessage);
                setPrivateChats(new Map(privateChats));
            }
            stompClient.send("/app/private-message", {}, JSON.stringify(chatMessage));
            setUserData({...userData, "message": ""});
        }
    }

    const handleUsername = (event) => {
        const {value} = event.target;
        setUserData({...userData, "username": value});
    }

    const handlePassword = (event) => {
        const {value} = event.target;
        setUserData({...userData, "password": value});
    }

    const handleNickName = (event) => {
        const {value} = event.target;
        setUserData({...userData, "nickName": value});
    }

    const registerUser = () => {
        connect();
    }
    return (
        <ToastProvider>
            <div className="container">
                {userData.connected ?
                    <div className="chat-box">
                        <div className="member-list">
                            <ul>
                                <li onClick={() => {
                                    setTab("CHATROOM")
                                }} className={`member ${tab === "CHATROOM" && "active"}`}>Chatroom
                                </li>
                                {[...privateChats.keys()].map((name, index) => (
                                    <li onClick={() => {
                                        setTab(name)
                                    }} className={`member ${tab === name && "active"}`} key={index}>{name}</li>
                                ))}
                            </ul>
                        </div>
                        {tab === "CHATROOM" && <div className="chat-content">
                            <ul className="chat-messages">
                                {publicChats.map((chat, index) => (
                                    <li className={`message ${chat.senderName === userData.username && "self"}`}
                                        key={index}>
                                        {chat.senderName !== userData.username &&
                                            <div className="avatar">{chat.senderName}</div>}
                                        <div className="message-data">{chat.message}</div>
                                        {chat.senderName === userData.username &&
                                            <div className="avatar self">{chat.senderName}</div>}
                                    </li>
                                ))}
                            </ul>

                            <div className="send-message">
                                <input type="text" className="input-message" placeholder="enter the message"
                                       value={userData.message} onChange={handleMessage}/>
                                <button type="button" className="send-button" onClick={sendValue}>send</button>
                            </div>
                        </div>}
                        {tab !== "CHATROOM" && <div className="chat-content">
                            <ul className="chat-messages">
                                {[...privateChats.get(tab)].map((chat, index) => (
                                    <li className={`message ${chat.senderName === userData.username && "self"}`}
                                        key={index}>
                                        {chat.senderName !== userData.username &&
                                            <div className="avatar">{chat.senderName}</div>}
                                        <div className="message-data">{chat.message}</div>
                                        {chat.senderName === userData.username &&
                                            <div className="avatar self">{chat.senderName}</div>}
                                    </li>
                                ))}
                            </ul>

                            <div className="send-message">
                                <input type="text" className="input-message" placeholder="enter the message"
                                       value={userData.message} onChange={handleMessage}/>
                                <button type="button" className="send-button" onClick={sendPrivateValue}>send</button>
                            </div>
                        </div>}
                    </div>
                    :
                    <div className="main">
                        <div className="register">
                            <h5 className="log-in-headings">Log in</h5>
                            <input
                                id="user-name"
                                placeholder="Enter your name"
                                name="userName"
                                value={userData.username}
                                onChange={handleUsername}
                                margin="normal"
                            />
                            <input
                                id="password"
                                placeholder="password"
                                name="password"
                                type={"password"}
                                value={userData.password}
                                onChange={handlePassword}
                                margin="normal"
                            />
                            <button type="button" onClick={registerUser}>
                                connect
                            </button>
                        </div>
                        <hr/>
                        <div className="create-account">
                            <h5 className="log-in-headings">Create account</h5>
                            <input
                                id="user-name"
                                placeholder="Enter your name"
                                name="userName"
                                value={userData.username}
                                onChange={handleUsername}
                                margin="normal"
                            />
                            <input
                                id="user-nickname"
                                placeholder="Enter your nickName"
                                name="nickName"
                                value={userData.nickName}
                                onChange={handleNickName}
                                margin="normal"
                            />
                            <input
                                id="password"
                                placeholder="password"
                                name="password"
                                type={"password"}
                                value={userData.password}
                                onChange={handlePassword}
                                margin="normal"
                            />
                            <button type="button" onClick={createAccount}>
                                create account
                            </button>
                        </div>
                    </div>}
            </div>
        </ToastProvider>
    )
}

export default ChatRoom
