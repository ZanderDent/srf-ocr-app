import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/react';
import './PipelineEstimator.css';

const terrainOptions = [
  { value: 'flat', label: 'Flat' },
  { value: 'hilly', label: 'Hilly' },
  { value: 'mountainous', label: 'Mountainous' },
  { value: 'swampy', label: 'Swampy' }
];

const PipelineEstimator: React.FC = () => {
  const [length, setLength] = useState<string>('');
  const [diameter, setDiameter] = useState<string>('');
  const [terrain, setTerrain] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  const handleEstimate = async () => {
    setError('');
    setResult(null);
    if (!length || !diameter || !terrain) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/pipeline-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length, diameter, terrain })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Estimation failed.');
      } else {
        setResult(data);
      }
    } catch (e) {
      setError('Network or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Pipeline Estimator</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard className="estimator-card">
          <IonCardHeader>
            <IonCardTitle>Estimate Pipeline Cost</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList className="form-section">
              <div className="form-group">
                <IonLabel position="stacked" className="form-label">Length (km)</IonLabel>
                <IonInput
                  className="custom-input"
                  type="number"
                  min="0"
                  placeholder="Enter length in kilometers"
                  value={length}
                  onIonChange={e => setLength(e.detail.value!)}
                />
              </div>
              <div className="form-group">
                <IonLabel position="stacked" className="form-label">Diameter (inches)</IonLabel>
                <IonInput
                  className="custom-input"
                  type="number"
                  min="0"
                  placeholder="Enter diameter in inches"
                  value={diameter}
                  onIonChange={e => setDiameter(e.detail.value!)}
                />
              </div>
              <div className="form-group">
                <IonLabel position="stacked" className="form-label">Terrain</IonLabel>
                <IonSelect
                  className="custom-input"
                  placeholder="Select terrain type"
                  value={terrain}
                  onIonChange={e => setTerrain(e.detail.value)}
                >
                  {terrainOptions.map(opt => (
                    <IonSelectOption key={opt.value} value={opt.value}>{opt.label}</IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </IonList>
            {error && <div className="error-message">{error}</div>}
            <IonButton expand="block" className="custom-button" onClick={handleEstimate} disabled={loading}>
              {loading ? <IonSpinner name="dots" /> : 'Estimate'}
            </IonButton>
          </IonCardContent>
        </IonCard>
        {result && (
          <IonCard className="result-card">
            <IonCardHeader>
              <IonCardTitle>Estimation Result</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <h3>Bill of Materials</h3>
              <ul>
                {result.bom && Object.entries(result.bom).map(([k, v]) => (
                  <li key={k}><strong>{k}:</strong> {String(v)}</li>
                ))}
              </ul>
              <h3>Cost Breakdown</h3>
              <ul>
                {result.cost && Object.entries(result.cost).map(([k, v]) => (
                  <li key={k}><strong>{k.replace('_', ' ')}:</strong> ${Number(v).toLocaleString()}</li>
                ))}
              </ul>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PipelineEstimator;