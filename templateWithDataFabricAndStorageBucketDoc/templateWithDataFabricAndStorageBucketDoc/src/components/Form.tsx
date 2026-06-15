import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import { Theme, MessageSeverity } from '@uipath/coded-action-app';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
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
  darkTheme: boolean;
  onToggleTheme: () => void;
}

type TabType = 'review' | 'applicant' | 'document';

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

  // Load document data only when switching to document tab
  useEffect(() => {
    if (activeTab === 'document' && !hasLoadedDocument && !isLoadingDocument && formData) {
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

  const handleApprove = async () => {
    await uipath.codedActionAppsService.completeTask('Approve', formData);
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
          className={`review-tab ${activeTab === 'applicant' ? 'review-tab--active' : ''}`}
          onClick={() => setActiveTab('applicant')}
        >
          Applicant History
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

        {activeTab === 'applicant' && (
          <section className="form-section">
            <h2 className="form-title">Loan History</h2>
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
          </section>
        )}

        {activeTab === 'document' && (
          <div className="pdf-shell">
            {isLoadingDocument ? (
              <div className="pdf-loading"><div className="pdf-spinner" />Loading PDF…</div>
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
                  {formData.loanDocumentStorageBucket && formData.loanDocumentFilePath
                    ? 'Document will load when task data is available.'
                    : 'No document path provided.'}
                </p>
              </div>
            )}
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
