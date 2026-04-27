import { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import companyLogo from '../assets/react.svg';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LoanDocument {
  ID: string;
  FullName: string;
}

interface FormData {
  applicantName: string;
  loanAmount: string;
  creditScore: string;
  riskFactor: string;
  reviewerComments: string;
  loanDocument: LoanDocument | null;
}

interface ManualFormProps {
  onInitTheme: (isDark: boolean) => void;
}

type TabType = 'review' | 'application';

const ManualForm = ({ onInitTheme }: ManualFormProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    loanAmount: '',
    creditScore: '',
    riskFactor: '',
    reviewerComments: '',
    loanDocument: null,
  });
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [pageRendering, setPageRendering] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme to light mode for manual form
  useState(() => {
    onInitTheme(false);
  });

  const zoomIn = () => setScale((s) => Math.min(2.5, parseFloat((s + 0.2).toFixed(1))));
  const zoomOut = () => setScale((s) => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))));
  const resetZoom = () => setScale(1.0);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      // Clean up previous blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setDocumentUrl(url);
      setFormData(prev => ({
        ...prev,
        loanDocument: {
          ID: 'manual_' + Date.now(),
          FullName: file.name
        }
      }));
    } else {
      alert('Please select a PDF file only.');
    }
  };

  const handleDownload = async () => {
    if (!documentUrl || !formData.loanDocument) return;
    const fileName = formData.loanDocument.FullName || 'document.pdf';

    const a = document.createElement('a');
    a.href = documentUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'riskFactor' && value !== '') {
      const num = Number(value);
      if (num < 0 || num > 10) {
        alert('Risk Factor must be between 0 and 10.');
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Prevent decimal point (.) and 'e' from being entered in Risk Factor field
    if (e.currentTarget.name === 'riskFactor' && (e.key === '.' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
    }
  };

  const handleSubmit = () => {
    // Show success message and print data
    alert('Form submitted successfully!');
    console.log('Form Data:', JSON.stringify(formData, null, 2));
  };

  const handleReset = () => {
    setFormData({
      applicantName: '',
      loanAmount: '',
      creditScore: '',
      riskFactor: '',
      reviewerComments: '',
      loanDocument: null,
    });

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Clean up blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    setDocumentUrl(null);
    setPageNumber(1);
    setNumPages(0);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));

  const riskFactorNum = Number(formData.riskFactor);
  const isRiskFactorValid = !!formData.riskFactor && riskFactorNum >= 0 && riskFactorNum <= 10;

  return (
    <form className="form-container" onSubmit={e => e.preventDefault()}>
      <div className="form-section">
        <div className="form-header">
          <div className="form-header-content">
            <div className="form-header-logo">
              <img src={companyLogo} alt="React Logo" width="48" height="48" />
            </div>
            <div className="form-header-title">
              <h1>Manual Loan Application Form</h1>
              <p>Fill out loan application details manually</p>
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
              Application Form
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
                    onChange={handleChange}
                    placeholder="Enter applicant name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="loanAmount">Loan Amount</label>
                  <input
                    type="number"
                    id="loanAmount"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleChange}
                    placeholder="Enter loan amount"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="creditScore">Credit Score</label>
                  <input
                    type="number"
                    id="creditScore"
                    name="creditScore"
                    value={formData.creditScore}
                    onChange={handleChange}
                    placeholder="Enter credit score"
                    step="0.01"
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
                    placeholder="Enter risk factor (0-10)"
                    step="1"
                    required
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
                  />
                </div>

                <div className="form-buttons">
                  <button
                    type="button"
                    className="accept-button"
                    onClick={handleSubmit}
                    disabled={!isRiskFactorValid}
                  >
                    Submit and Trigger Workflow
                  </button>
                  <button
                    type="button"
                    className="reject-button"
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'application' && (
              <div className="tab-panel">
                <h2>Attachments</h2>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="fileUpload">Upload PDF Document</label>
                  <input
                    type="file"
                    id="fileUpload"
                    ref={fileInputRef}
                    accept=".pdf"
                    onChange={handleFileUpload}
                    style={{ marginTop: '8px' }}
                  />
                </div>

                <div className="pdf-shell">
                  {documentUrl ? (
                    <>
                      <div className="pdf-toolbar">
                        <div className="pdf-toolbar__group">
                          <button type="button" className="pdf-btn" onClick={goToPrevPage} disabled={pageNumber <= 1} title="Previous page">‹</button>
                          <span className="pdf-page-info">
                            <span className="pdf-page-info__current">{pageNumber}</span>
                            <span className="pdf-page-info__sep">/</span>
                            <span className="pdf-page-info__total">{numPages || '–'}</span>
                          </span>
                          <button type="button" className="pdf-btn" onClick={goToNextPage} disabled={pageNumber >= numPages} title="Next page">›</button>
                        </div>
                        <div className="pdf-toolbar__group">
                          <button type="button" className="pdf-btn" onClick={zoomOut} disabled={scale <= 0.4} title="Zoom out">−</button>
                          <button type="button" className="pdf-btn pdf-btn--zoom-label" onClick={resetZoom} title="Reset zoom">
                            {Math.round(scale * 100)}%
                          </button>
                          <button type="button" className="pdf-btn" onClick={zoomIn} disabled={scale >= 2.5} title="Zoom in">+</button>
                        </div>
                        <div className="pdf-toolbar__group">
                          <button type="button" className="pdf-btn pdf-btn--download" onClick={handleDownload} title="Download PDF">
                            ⬇ Download
                          </button>
                        </div>
                      </div>
                      <div className="pdf-viewport">
                        <Document
                          file={documentUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={<div className="pdf-loading"><div className="pdf-spinner" />Loading PDF…</div>}
                          error={<div className="pdf-page-error">Failed to load PDF.</div>}
                        >
                          <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            onRenderSuccess={() => setPageRendering(false)}
                            onRenderError={() => setPageRendering(false)}
                            loading={<div className="pdf-page-loading">Rendering page…</div>}
                            className={`pdf-page${pageRendering ? ' pdf-page--rendering' : ''}`}
                          />
                        </Document>
                      </div>
                    </>
                  ) : (
                    <div className="pdf-shell--center">
                      <p className="pdf-empty">
                        Please upload a PDF document to view it here.
                      </p>
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

export default ManualForm;