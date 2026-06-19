import { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import { Theme, MessageSeverity } from '@uipath/coded-action-app';
import {
  ValidationStation,
  ValidationStationLanguage,
} from '@uipath/ui-widgets-validation-station';
import type { DuFramework } from '@uipath/uipath-typescript/document-understanding';
import companyLogo from '../assets/react.svg';
import uipath from '../uipath';

type ContentValidationData = DuFramework.ContentValidationData;
type VsTheme = 'light' | 'dark' | 'light-hc' | 'dark-hc';

interface FormData {
  applicantName: string;
  loanAmount: string;
  creditScore: string;
  riskFactor: string;
  reviewerComments: string;
  loanDocument: ContentValidationData | null;
}

interface FormProps {
  onInitTheme: (isDark: boolean) => void;
}

type TabType = 'review' | 'validation';

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

// Map the Action Center theme onto the Validation Station theme union.
const toVsTheme = (theme: Theme): VsTheme => {
  switch (theme) {
    case Theme.Dark:
      return 'dark';
    case Theme.LightHighContrast:
      return 'light-hc';
    case Theme.DarkHighContrast:
      return 'dark-hc';
    default:
      return 'light';
  }
};

const Form = ({ onInitTheme }: FormProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    loanAmount: '',
    creditScore: '',
    riskFactor: '',
    reviewerComments: '',
    loanDocument: null,
  });
  const [folderId, setFolderId] = useState<number | undefined>(undefined);
  const [vsTheme, setVsTheme] = useState<VsTheme>('light');

  useEffect(() => {
    const init = async () => {
      const task = await uipath.codedActionAppsService.getTask();
      if (task.data) {
        setFormData(task.data as FormData);
      }
      setIsReadOnly(task.isReadOnly);
      setFolderId(task.folderId);
      setVsTheme(toVsTheme(task.theme));
      onInitTheme(isDarkTheme(task.theme));
    };
    init();
  }, [onInitTheme]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    uipath.codedActionAppsService.setTaskData(updatedData);

    if (name === 'riskFactor' && value !== '') {
      const num = Number(value);
      if (num < 0 || num > 10) {
        uipath.codedActionAppsService.showMessage('Risk Factor must be between 0 and 10.', MessageSeverity.Error);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Prevent decimal point (.) and 'e' from being entered in Risk Factor field
    if (e.currentTarget.name === 'riskFactor' && (e.key === '.' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
    }
  };

  const handleComplete = async () => {
    // Complete the task with the current form data as-is (loanDocument included, unchanged).
    await uipath.codedActionAppsService.completeTask('Complete', formData);
  };

  return (
    <form className="form-container" onSubmit={e => e.preventDefault()}>
      <div className="form-section">
        <div className="form-header">
          <div className="form-header-content">
            <div className="form-header-logo">
              <img src={companyLogo} alt="React Logo" width="48" height="48" />
            </div>
            <div className="form-header-title">
              <h1>Loan Application Review</h1>
              <p>Review and approve loan applications</p>
            </div>
          </div>
        </div>

        <div className="tabs-container">
          <div className="tab-navigation">
          <button
            type="button"
            className={`tab-button ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Review Application
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            Document Validation
          </button>
        </div>

        <div className="tab-content">
          <div className="tab-panel" style={{ display: activeTab === 'review' ? undefined : 'none' }}>
              <h2 className="review-heading">Application Details</h2>

              <div className="form-group">
                <label htmlFor="applicantName">Applicant Name</label>
                <input
                  type="text"
                  id="applicantName"
                  name="applicantName"
                  value={formData.applicantName}
                  placeholder="Enter applicant name"
                  readOnly
                />
              </div>

              <div className="form-group">
                <label htmlFor="loanAmount">Loan Amount</label>
                <input
                  type="number"
                  id="loanAmount"
                  name="loanAmount"
                  value={formData.loanAmount}
                  placeholder="Enter loan amount"
                  step="0.01"
                  readOnly
                />
              </div>

              <div className="form-group">
                <label htmlFor="creditScore">Credit Score</label>
                <input
                  type="number"
                  id="creditScore"
                  name="creditScore"
                  value={formData.creditScore}
                  placeholder="Enter credit score"
                  step="0.01"
                  readOnly
                />
              </div>

              <div className="form-group">
                <label htmlFor="riskFactor">Risk Factor <span className="required-marker">*</span></label>
                <input
                  type="number"
                  id="riskFactor"
                  name="riskFactor"
                  value={formData.riskFactor}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter risk factor"
                  step="1"
                  required
                  readOnly={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reviewerComments">Reviewer Comments</label>
                <textarea
                  id="reviewerComments"
                  name="reviewerComments"
                  value={formData.reviewerComments}
                  onChange={handleChange}
                  placeholder="Enter reviewer comments"
                  rows={4}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="form-buttons">
                <button type="button" className="complete-button" onClick={handleComplete} disabled={isReadOnly}>
                  Complete
                </button>
              </div>
          </div>

          <div className="tab-panel" style={{ display: activeTab === 'validation' ? undefined : 'none' }}>
              <h2>Document Validation</h2>
              <div className="validation-shell">
                {!formData.loanDocument ? (
                  <div className="validation-shell--center">
                    <p className="validation-empty">No document validation data provided.</p>
                  </div>
                ) : (
                  <ValidationStation
                    sdk={uipath.sdk}
                    data={formData.loanDocument}
                    folderId={folderId ?? formData.loanDocument.FolderId}
                    theme={vsTheme}
                    language={ValidationStationLanguage.English}
                    isReadonly={isReadOnly}
                    onSaveComplete={(result) => {
                      if (result.success) {
                        uipath.codedActionAppsService.showMessage('Validated data saved successfully.', MessageSeverity.Success);
                      } else {
                        uipath.codedActionAppsService.showMessage(
                          `Failed to save validated data: ${result.error}`,
                          MessageSeverity.Error,
                        );
                      }
                    }}
                  />
                )}
              </div>

              <div className="form-buttons">
                <button type="button" className="complete-button" onClick={handleComplete} disabled={isReadOnly}>
                  Complete
                </button>
              </div>
          </div>
        </div>
        </div>
      </div>
    </form>
  );
};

export default Form;
