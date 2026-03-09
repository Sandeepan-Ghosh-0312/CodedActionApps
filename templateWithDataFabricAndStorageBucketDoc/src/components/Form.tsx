import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import { Theme, MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import companyLogo  from '../assets/react.svg'
import { Document, Page, pdfjs } from 'react-pdf';
import uipath from '../uipath';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FormData {
  applicantName: string;
  loanAmount: string;
  creditScore: string;
  riskFactor: string;
  reviewerComments: string;
  loanDocumentStorageBucket: string;
  loanDocumentFilePath: string;
}

interface LoanHistory {
  id: number;
  loanType: string;
  amount: number;
  processingDate: string;
  status: string;
  duration: string;
}

interface FormProps {
  onInitTheme: (isDark: boolean) => void;
}

type TabType = 'review' | 'applicant' | 'application';

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
    reviewerComments: '',
    loanDocumentStorageBucket: '',
    loanDocumentFilePath: '',

  });
  const [loanHistory, setLoanHistory] = useState<LoanHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [hasLoadedDocument, setHasLoadedDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [pageRendering, setPageRendering] = useState(false);
  const [folderId, setFolderId] = useState<any>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    uipath.codedActionAppsService.getTask().then((task) => {
      if (task.data) {
        setFormData(task.data as FormData);
        setFolderId(task.folderId);
      }
      setIsReadOnly(task.isReadOnly);
      onInitTheme(isDarkTheme(task.theme));
    });
  }, [onInitTheme]);

  // Load loan history data only when switching to applicant tab
  useEffect(() => {
    if (activeTab === 'applicant' && !hasLoadedHistory && !isLoadingHistory) {
      const loadLoanHistory = async () => {
        try {
          setIsLoadingHistory(true);
          const response = await uipath.entityService.getAllRecords('529093a4-1fc6-f011-8195-6045bd0240b6', {
            pageSize: 5,
            expansionLevel: 1
          });
          console.log('Loan history response:', response);

          // Map the response to LoanHistory format
          if (response && response.items) {
            const mappedHistory = response.items.map((record: any, index: number) => ({
              id: index + 1,
              loanType: record.loanType || record.LoanType || 'N/A',
              amount: record.amount || record.Amount || 0,
              processingDate: record.processingDate || record.Date || new Date().toISOString(),
              status: record.status || record.Status || 'Unknown',
              duration: record.duration || record.Duration || 'N/A'
            }));
            setLoanHistory(mappedHistory);
          }
          setHasLoadedHistory(true);
        } catch (error) {
          console.error('Error loading loan history:', error);
          // Set empty array or fallback data on error
          setLoanHistory([]);
          setHasLoadedHistory(true);
        } finally {
          setIsLoadingHistory(false);
        }
      };

      loadLoanHistory();
    }
  }, [activeTab, hasLoadedHistory, isLoadingHistory]);

  // Load document data only when switching to application tab
  useEffect(() => {
    if (activeTab === 'application' && !hasLoadedDocument && !isLoadingDocument && formData) {
      if (!formData.loanDocumentStorageBucket || !folderId || !formData.loanDocumentFilePath) return;
      let cancelled = false;

      const loadDocument = async () => {
        try {
          setIsLoadingDocument(true);
          setDocumentError(null);
          const bucketsResponse = await uipath.bucketService.getAll({
            filter: `name eq '${formData.loanDocumentStorageBucket}'`
          });

          const bucket = bucketsResponse.items.find((b: any) => b.name === formData.loanDocumentStorageBucket);
          if (!bucket) throw new Error(`Bucket "${formData.loanDocumentStorageBucket}" not found.`);

          const uriResponse = await uipath.bucketService.getReadUri({
            bucketId: bucket.id,
            folderId: folderId,
            path: formData.loanDocumentFilePath
          });

          let url: string;
          if ((uriResponse as any).requiresAuth) {
            const response = await fetch(uriResponse.uri, { headers: (uriResponse as any).headers });
            if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
            const blob = await response.blob();
            url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
          } else {
            url = uriResponse.uri;
          }

          if (!cancelled) setDocumentUrl(url);
          if (!cancelled) setHasLoadedDocument(true);
        } catch (err: unknown) {
          if (!cancelled) setDocumentError(err instanceof Error ? err.message : 'Failed to load document.');
          if (!cancelled) setHasLoadedDocument(true);
        } finally {
          if (!cancelled) setIsLoadingDocument(false);
        }
      };

      loadDocument();

      return () => {
        cancelled = true;
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasLoadedDocument, formData, folderId]);


  const zoomIn  = () => setScale((s) => Math.min(2.5, parseFloat((s + 0.2).toFixed(1))));
  const zoomOut = () => setScale((s) => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))));
  const resetZoom = () => setScale(1.0);

  const handleDownload = async () => {
    if (!documentUrl) return;
    const fileName = formData.loanDocumentFilePath.split('/').pop() || 'document.pdf';
    let blobUrl: string;
    let tempBlob = false;
    if (documentUrl.startsWith('blob:')) {
      blobUrl = documentUrl;
    } else {
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      tempBlob = true;
    }
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (tempBlob) URL.revokeObjectURL(blobUrl);
  };

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

  const handleAccept = async () => {
    await uipath.codedActionAppsService.completeTask('Accept', formData);
  };

  const handleReject = async () => {
    await uipath.codedActionAppsService.completeTask('Reject', formData);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));

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
            className={`tab-button ${activeTab === 'applicant' ? 'active' : ''}`}
            onClick={() => setActiveTab('applicant')}
          >
            Applicant History
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

          {/* Applicant Details Tab */}
          {activeTab === 'applicant' && (
            <div className="tab-panel">
              <h2>Loan History</h2>
              {isLoadingHistory ? (
                <div className="loading-message">
                  <div className="spinner"></div>
                  Loading loan history...
                </div>
              ) : loanHistory.length === 0 ? (
                <div className="empty-message">No loan history available in Data Fabric</div>
              ) : (
                <div className="loan-history-grid">
                  <table className="loan-history-table">
                    <thead>
                      <tr>
                        <th>Loan Type</th>
                        <th>Amount</th>
                        <th>Processing Date</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanHistory.map((loan) => (
                        <tr key={loan.id}>
                          <td>{loan.loanType}</td>
                          <td>{loan.amount.toLocaleString()}</td>
                          <td>{loan.processingDate}</td>
                          <td>{loan.duration}</td>
                          <td>
                            <span className={`status-badge ${loan.status.toLowerCase()}`}>
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'application' && (
            <div className="tab-panel">
              <h2>Attachments</h2>
              <div className="pdf-shell">
                {isLoadingDocument ? (
                  <div className="pdf-skeleton">
                    <div className="pdf-skeleton__toolbar" />
                    <div className="pdf-skeleton__page" />
                  </div>
                ) : documentError ? (
                  <div className="pdf-shell--center">
                    <div className="pdf-error">
                      <span className="pdf-error__icon">⚠</span>
                      <p>{documentError}</p>
                    </div>
                  </div>
                ) : documentUrl ? (
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
                        loading={<div className="pdf-page-loading">Loading…</div>}
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
                      {formData.loanDocumentStorageBucket && formData.loanDocumentFilePath
                        ? 'Document will load when task data is available.'
                        : 'No document path provided.'}
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

export default Form;
