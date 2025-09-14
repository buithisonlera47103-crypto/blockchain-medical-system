import React from 'react';

import EnhancedNavigation from './EnhancedNavigation';
import Footer from './Footer';
import TechArchitecture from './TechArchitecture';

const TechArchitecturePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-primary/5 via-white to-medical-secondary/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden backdrop-blur-sm">
      {/* Enhanced Navigation */}
      <EnhancedNavigation />

      {/* Main Content with proper spacing for fixed navigation */}
      <div className="pt-16">
        <TechArchitecture />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default TechArchitecturePage;
