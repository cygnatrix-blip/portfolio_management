import { Link } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'; // Icon for Transactions

const ClientSidebar = () => (
  <List>
    <ListItem disablePadding>
      <ListItemButton component={Link} to="/">
        <ListItemIcon sx={{ color: 'inherit' }}>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItemButton>
    </ListItem>
    <ListItem disablePadding>
      <ListItemButton component={Link} to="/transactions">
        <ListItemIcon sx={{ color: 'inherit' }}>
          <SwapHorizIcon />
        </ListItemIcon>
        <ListItemText primary="Transactions" />
      </ListItemButton>
    </ListItem>
  </List>
);

export default ClientSidebar;