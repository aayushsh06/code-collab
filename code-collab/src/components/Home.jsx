import React from 'react'
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import Notification from './Notification';
import '../styles/Home.css';


const Home = () => {
    const [roomId, setRoomId] = useState('')
    const [username, setUsername] = useState('')
    const [showNotification, setShowNotification] = useState(false)
   
    const visitRoom = () => {

    }

    const createRoom = (e) => {
        e.preventDefault();
        const id = uuidv4();
        setRoomId(id);
        setShowNotification(true);
        setTimeout(() => {
            setShowNotification(false);
          }, 1500);
    }

    return (
        <>
        {showNotification && <Notification message='Room Created'/>}
        <h1>Welcome to Code Collab</h1>
            <div className='inputs'>
                <input className='enterRoomId' placeholder='Room ID' value={roomId} onChange={(e) => {setRoomId(e.target.value)}}/>
                <input className='enterUsername' placeholder='Username' value={username} onChange={(e) => setUsername(e.target.value)}/>
                <button className='travelButton' onClick={visitRoom}>Travel To Room</button>
                <button className='createButton' onClick={createRoom}>Create Room</button>
            </div>
        </>
    )
}

export default Home
