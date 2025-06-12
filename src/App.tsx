import { IonApp, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { constructOutline, calculatorOutline } from 'ionicons/icons';
import { Route, Navigate } from 'react-router-dom';
import ConstructionTracker from './pages/ConstructionTracker';
import PipelineEstimator from './pages/PipelineEstimator';

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route path="/tracker" element={<ConstructionTracker />} />
          <Route path="/pipeline" element={<PipelineEstimator />} />
          <Route path="/" element={<Navigate to="/tracker" replace />} />
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="tracker" href="/tracker">
            <IonIcon icon={constructOutline} />
            <IonLabel>Construction</IonLabel>
          </IonTabButton>
          <IonTabButton tab="pipeline" href="/pipeline">
            <IonIcon icon={calculatorOutline} />
            <IonLabel>Pipeline Estimator</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
