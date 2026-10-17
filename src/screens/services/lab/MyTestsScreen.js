import React from 'react';
import LabTestsScreen from './LabTestsScreen.js';

const MyTestsScreen = (props) => {
  return (
    <LabTestsScreen
      {...props}
      route={{
        ...props.route,
        params: {
          ...props.route?.params,
          initialTab: 'BOOKINGS',
        },
      }}
    />
  );
};

export default MyTestsScreen;
