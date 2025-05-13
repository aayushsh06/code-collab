import React from 'react'
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import '../styles/Home.css'

const Home = () => {
    const [roomId, setRoomId] = useState('')
    const [username, setUsername] = useState('')

    const visitRoom = () => {

    }

    const createRoom = (e) => {
        e.preventDefault();
        const id = uuidv4();
        setRoomId(id);
    }

    return (
        <>
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
