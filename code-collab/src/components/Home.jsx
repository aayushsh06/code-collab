import { v4 as uuidv4 } from 'uuid';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom'
import Notification from './Notification';
import '../styles/Home.css';


const Home = () => {
    const [roomId, setRoomId] = useState('')
    const [username, setUsername] = useState('')
    const navigate = useNavigate()
    const[showNotification, setShowNotification] = useState(false);
    const[notificationMessage, setNotificationMessage] = useState('');
    const timeOutRef = useRef(null);
    const notificationDuration = 3000;
  
    //Notification
    const showNotificationWithTimeout = (message) => {
      if (timeOutRef.current) {
        clearTimeout(timeOutRef.current);
      }
      setNotificationMessage(message);
      setShowNotification(true);
      timeOutRef.current = setTimeout(() => {
        setShowNotification(false);
        timeOutRef.current = null;
      }, notificationDuration);
    };

    const visitRoom = () => {
        if (!roomId || !username) {
            showNotificationWithTimeout('Enter Room ID and Username');
            return;
        }
    
        navigate(`/editor/${roomId}`, {
            state: { username }
        });
    };
    
    const createRoom = (e) => {
        e.preventDefault();
        const id = uuidv4();
        setRoomId(id);
        showNotificationWithTimeout('Room Created - Save Your Room ID!');
    };
    
    const copyRoomId = () => {
        if (!roomId) {
            showNotificationWithTimeout('Create a room first');
            return;
        }
        
        navigator.clipboard.writeText(roomId)
            .then(() => {
                showNotificationWithTimeout('Room ID Copied to Clipboard');
            })
            .catch(() => {
                showNotificationWithTimeout('Failed to copy - please select and copy manually');
            });
    };

    return (
        <div className="home-container">
            {showNotification && <Notification message={notificationMessage}/>}
            
            <div className="home-header">
                <h1>Welcome to Code Collab</h1>
                <p className="subtitle">A real-time collaborative code editor</p>
            </div>
            
            <div className="portal-container">
                <div className="inputs">
                    <div className="input-group">
                        <label htmlFor="username">Your Name</label>
                        <input 
                            id="username"
                            className="enterUsername" 
                            placeholder="Enter your name" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    
                    <div className="separator">
                        <div className="line"></div>
                        <span>Room Details</span>
                        <div className="line"></div>
                    </div>
                    
                    <div className="action-group">
                        <button className="createButton" onClick={createRoom}>
                            Create New Room
                        </button>
                        <span className="or-text">OR</span>
                    </div>
                    
                    <div className="input-group room-input-group">
                        <label htmlFor="roomId">Room ID</label>
                        <div className="room-input-container">
                            <input 
                                id="roomId"
                                className="enterRoomId" 
                                placeholder="Enter existing Room ID" 
                                value={roomId} 
                                onChange={(e) => {setRoomId(e.target.value)}}
                            />
                            {roomId && (
                                <button className="copy-button" onClick={copyRoomId}>
                                    Copy
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <button className="travelButton" onClick={visitRoom}>
                        Join Room
                    </button>
                    
                    <div className="info-box">
                        <div className="info-icon">ℹ️</div>
                        <p>
                            Remember to save your Room ID! Rooms and code are automatically deleted after 24 hours of inactivity.
                        </p>
                    </div>
                </div>
            </div>
            
            <footer className="home-footer">
                <p>© {new Date().getFullYear()} Code Collab - Collaborative Coding Made Simple</p>
            </footer>
        </div>
    )
}

export default Home
