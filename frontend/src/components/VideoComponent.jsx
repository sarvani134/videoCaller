import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Host from './Host'
import Join from './Join'

function VideoComponent() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <div className="dashboard">
      <Sidebar/>

      <main>
        {activeTab === 'home' && (
          <>
            <Host />
            <Join />
          </>
        )}
        {activeTab === 'upcoming' && <p>Upcoming meetings</p>}
        {activeTab === 'history' && <p>Meeting history</p>}
      </main>
    </div>
  )
}

export default VideoComponent
