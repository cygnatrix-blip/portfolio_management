import { Link } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BuildIcon from '@mui/icons-material/Build'; // Icon for Admin Actions

const AdminSidebar = () => (
  <List>
    <ListItem disablePadding>
      <ListItemButton component={Link} to="/">
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItemButton>
    </ListItem>
    <ListItem disablePadding>
      <ListItemButton component={Link} to="/clients">
        <ListItemIcon>
          <PeopleIcon />
        </ListItemIcon>
        <ListItemText primary="Clients" />
      </ListItemButton>
    </ListItem>
    <ListItem disablePadding>
      <ListItemButton component={Link} to="/transactions">
        <ListItemIcon>
          <SwapHorizIcon />
        </ListItemIcon>
        <ListItemText primary="Transactions" />
      </ListItemButton>
    </ListItem>
    <ListItem disablePadding>
      <ListItemButton component={Link} to="/admin-actions">
        <ListItemIcon>
          <BuildIcon />
        </ListItemIcon>
        <ListItemText primary="Admin Actions" />
      </ListItemButton>
    </ListItem>
  </List>
);

export default AdminSidebar;