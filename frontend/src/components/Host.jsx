import React from 'react'
import { useNavigate } from 'react-router-dom'


function Host() {
  const navigate=useNavigate()
  const handleStart=()=>{
  const roomId=crypto.randomUUID()
  console.log(roomId)
  navigate(`/meeting/${roomId}`,{state:{isHost:true}})
}

  return (
    <div>
      <h1>Host a meeting </h1>
      <button onClick={()=>handleStart()}>Start a meeting</button>
      
    </div>
  )
}

export default Host
