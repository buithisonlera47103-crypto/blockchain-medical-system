import React from 'react';

import EnhancedNavigation from './EnhancedNavigation';
import FeatureSpecs from './FeatureSpecs';
import Footer from './Footer';

const FeatureSpecsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-primary/5 via-white to-medical-secondary/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden backdrop-blur-sm">
      <EnhancedNavigation />
      <div className="pt-16">
        <FeatureSpecs />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default FeatureSpecsPage;
