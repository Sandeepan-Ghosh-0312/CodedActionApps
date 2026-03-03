import { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import codedActionApps from '../uipath';
import { Theme, MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import companyLogo  from '../assets/react.svg'
import invoicePdf from '../assets/wordpress-pdf-invoice-plugin-sample.pdf';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FormData {
  applicantName: string;
  loanAmount: string;
  creditScore: string;
  riskFactor: string;
  reviewerComments: string;
}

interface FormProps {
  onInitTheme: (isDark: boolean) => void;
}

type TabType = 'review' | 'application';

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

const Form = ({ onInitTheme }: FormProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    loanAmount: '',
    creditScore: '',
    riskFactor: '',
    reviewerComments: ''
  });
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

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

  const handleAccept = async () => {
    await codedActionApps.completeTask('Accept', formData);
  };

  const handleReject = async () => {
    await codedActionApps.completeTask('Reject', formData);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const riskFactorNum = Number(formData.riskFactor);
  const isRiskFactorValid = !!formData.riskFactor && riskFactorNum >= 0 && riskFactorNum <= 10;
  const isFormValid = !isReadOnly && isRiskFactorValid;

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
            className={`tab-button ${activeTab === 'application' ? 'active' : ''}`}
            onClick={() => setActiveTab('application')}
          >
            Attachments
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'review' && (
            <div className="tab-panel">
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
                <button type="button" className="accept-button" onClick={handleAccept} disabled={!isFormValid}>
                  Accept
                </button>
                <button type="button" className="reject-button" onClick={handleReject} disabled={!isFormValid}>
                  Reject
                </button>
              </div>
            </div>
          )}

          {activeTab === 'application' && (
            <div className="tab-panel">
              <h2>Attachments</h2>
              <div className="application-image-container">
                <div className="pdf-viewer-box">
                  <Document
                    file={invoicePdf}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div>Loading PDF...</div>}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={600}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                </div>
                {numPages && (
                  <div className="pdf-controls">
                    <button
                      type="button"
                      onClick={goToPrevPage}
                      disabled={pageNumber <= 1}
                      className="pdf-nav-button"
                    >
                      Previous
                    </button>
                    <span className="pdf-page-info">
                      Page {pageNumber} of {numPages}
                    </span>
                    <button
                      type="button"
                      onClick={goToNextPage}
                      disabled={pageNumber >= numPages}
                      className="pdf-nav-button"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </form>
  );
};

export default Form;
