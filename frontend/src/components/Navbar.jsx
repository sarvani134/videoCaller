import { NavLink } from 'react-router-dom'
import Logout from './Logout'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="app-navbar" aria-label="Main navigation">
      {/* <a className="navbar-home" href="/" aria-current="page">Home</a> */}
      <NavLink className="navbar-home" to="/" end>Home</NavLink>
      
      <Logout />
    </nav>
  )
}

export default Navbar