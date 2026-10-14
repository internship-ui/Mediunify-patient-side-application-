import React from 'react';
import ImagingScreenWeb from './ImagingScreen.web';

/**
 * RadiologyLabsScreen
 * Forwards to the unified Scans & X-Ray / Radiology flow in Providers / Choose Centre view.
 */
const RadiologyLabsScreen = (props) => {
  return (
    <ImagingScreenWeb
      {...props}
      route={{
        ...props.route,
        params: {
          ...props.route?.params,
          initialView: 'providers',
        },
      }}
    />
  );
};

export default RadiologyLabsScreen;
