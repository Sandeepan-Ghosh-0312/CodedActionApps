import { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import codedActionApps from '../uipath';
import { Theme, MessageSeverity } from '@uipath/coded-action-app';
import loanImage from '../assets/loanApplication.png';

interface FormData {
  applicantName: string;
  loanAmount: string;
  creditScore: string;
  riskFactor: string;
  reviewerComments: string;
}

interface FormProps {
  onInitTheme: (isDark: boolean) => void;
  darkTheme: boolean;
  onToggleTheme: () => void;
}

type TabType = 'review' | 'document';

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

const Form = ({ onInitTheme, darkTheme, onToggleTheme }: FormProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    loanAmount: '',
    creditScore: '',
    riskFactor: '',
    reviewerComments: ''
  });

  useEffect(() => {
    codedActionApps.getTask().then((task) => {
      if (task.data) {
        setFormData(task.data as FormData);
      }
      setIsReadOnly(task.isReadOnly);
      onInitTheme(isDarkTheme(task.theme));
    });
  }, [onInitTheme]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    codedActionApps.setTaskData(updatedData);

    if (name === 'riskFactor' && value !== '') {
      const num = Number(value);
      if (num < 0 || num > 10) {
        codedActionApps.showMessage('Risk Factor must be between 0 and 10.', MessageSeverity.Error);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Prevent decimal point (.) and 'e' from being entered in Risk Factor field
    if (e.currentTarget.name === 'riskFactor' && (e.key === '.' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
    }
  };

  const handleApprove = async () => {
    await codedActionApps.completeTask('Approve', formData);
  };

  const handleReject = async () => {
    await codedActionApps.completeTask('Reject', formData);
  };

  const formatCurrency = (value: string) => {
    const n = Number(value);
    if (!value || Number.isNaN(n)) return value || '';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
  };

  const riskFactorNum = Number(formData.riskFactor);
  const isRiskFactorValid = !!formData.riskFactor && riskFactorNum >= 0 && riskFactorNum <= 10;
  const isFormValid = !isReadOnly && isRiskFactorValid;

  return (
    <div className="review-app">
      <header className="review-header">
        <div className="review-header__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9 15l2 2 4-4" />
          </svg>
        </div>
        <div className="review-header__titles">
          <h1 className="review-header__title">Loan Application Review</h1>
          <p className="review-header__subtitle">
            Review the applicant details and supporting document, then record your decision.
          </p>
        </div>
        <div className="review-header__actions">
          {isReadOnly && <span className="review-badge">Read only</span>}
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkTheme ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <nav className="review-tabs">
        <button
          type="button"
          className={`review-tab ${activeTab === 'review' ? 'review-tab--active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          Review Form
        </button>
        <button
          type="button"
          className={`review-tab ${activeTab === 'document' ? 'review-tab--active' : ''}`}
          onClick={() => setActiveTab('document')}
        >
          Document
        </button>
      </nav>

      <div className="form-container form-container--enter">
        {activeTab === 'review' && (
          <>
            <section className="form-section">
              <h2 className="form-title">Applicant Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="applicantName">Applicant Name</label>
                  <input id="applicantName" name="applicantName" value={formData.applicantName} placeholder="—" readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="loanAmount">Loan Amount</label>
                  <input id="loanAmount" name="loanAmount" value={formatCurrency(formData.loanAmount)} placeholder="—" readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="creditScore">Credit Score</label>
                  <input id="creditScore" name="creditScore" value={formData.creditScore} placeholder="—" readOnly />
                </div>
              </div>
            </section>

            <section className="form-section">
              <h2 className="form-title">Reviewer Assessment</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="riskFactor">Risk Factor <span className="req" aria-hidden="true">*</span></label>
                  <input
                    type="number"
                    id="riskFactor"
                    name="riskFactor"
                    value={formData.riskFactor}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter a value from 0 to 10"
                    step="1"
                    min={0}
                    max={10}
                    required
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
              <div className="form-group form-group--spaced">
                <label htmlFor="reviewerComments">Reviewer Comments</label>
                <textarea
                  id="reviewerComments"
                  name="reviewerComments"
                  value={formData.reviewerComments}
                  onChange={handleChange}
                  placeholder="Add your review notes…"
                  rows={5}
                  readOnly={isReadOnly}
                />
              </div>
            </section>
          </>
        )}

        {activeTab === 'document' && (
          <div className="application-image-container">
            <img src={loanImage} alt="Loan application document" />
          </div>
        )}
      </div>

      <div className="form-buttons">
        <button type="button" className="outcome-btn outcome-btn--secondary" onClick={handleReject} disabled={!isFormValid}>
          Reject
        </button>
        <button type="button" className="outcome-btn outcome-btn--primary" onClick={handleApprove} disabled={!isFormValid}>
          Approve
        </button>
      </div>
    </div>
  );
};

export default Form;
