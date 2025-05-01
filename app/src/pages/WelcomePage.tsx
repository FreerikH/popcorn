import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tabs,
  Tab,
  Box
} from '@mui/material';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

const Welcome = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const navigate = useNavigate();
  
  const handleTabChange = (_event:any, newValue:any) => {
    setTabIndex(newValue);
  };
  
  return (
    <Box border='1px solid red' sx={{p:0}}>
      <Tabs 
        value={tabIndex} 
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          minHeight: 40
        }}
      >
        <Tab label="Sign In" sx={{ textTransform: 'none', minHeight: 40 }} />
        <Tab label="Register" sx={{ textTransform: 'none', minHeight: 40 }} />
      </Tabs>
      
      {tabIndex === 0 ? (
        <LoginForm onLoginSuccess={() => navigate('/dashboard')} />
      ) : (
        <RegisterForm
          onRegisterSuccess={() => setTabIndex(0)}
          onSwitchToLogin={() => setTabIndex(0)}
        />
      )}
    </Box>
  );
};

export default Welcome;