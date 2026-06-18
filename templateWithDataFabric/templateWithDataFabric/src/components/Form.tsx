import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import './Form.css';
import { Theme, MessageSeverity } from '@uipath/coded-action-app';
import { LogicalOperator, QueryFilterOperator } from '@uipath/uipath-typescript/entities';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Document, Page, pdfjs } from 'react-pdf';
import uipath from '../uipath';
import documentIcon from '../assets/documentIcon.png';
import themeToggler from '../assets/themeToggler.png';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Data Fabric entity backing this form.
const ENTITY_NAME = 'testEntity';
// File-type field on the entity that holds the application PDF.
const LOAN_DOCUMENT_FIELD = 'LoanDocument';

interface FormData {
  applicantName: string;
  loanAmount: string | number;
  creditScore: string | number;
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
    reviewerComments: '',
  });

  // Data Fabric record state
  const [entityId, setEntityId] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [hasDocument, setHasDocument] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PDF viewer state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [hasLoadedDocument, setHasLoadedDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [pageRendering, setPageRendering] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const didLoadRef = useRef(false);

  // Load the task once, then resolve testEntity and fetch the record by applicant name.
  // Guarded by a ref so it runs exactly once (and stays StrictMode-safe), and the loading
  // flag is always cleared in `finally` so a missing record never leaves a stuck spinner.
  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    const init = async () => {
      try {
        const task = await uipath.codedActionAppsService.getTask();
        setIsReadOnly(task.isReadOnly);
        onInitTheme(isDarkTheme(task.theme));

        const applicant = (task.data as Partial<FormData> | undefined)?.applicantName ?? '';
        setFormData((prev) => ({ ...prev, applicantName: applicant }));

        if (!applicant) {
          setRecordError('No applicant name was provided in the task data.');
          return;
        }

        setIsLoadingRecord(true);

        const entities = await uipath.entityService.getAll();
        const entity = entities.find((e: any) => e.name === ENTITY_NAME);
        if (!entity) {
          setRecordError(`Entity "${ENTITY_NAME}" was not found.`);
          return;
        }

        const result = await uipath.entityService.queryRecordsById(entity.id, {
          filterGroup: {
            logicalOperator: LogicalOperator.And,
            queryFilters: [
              { fieldName: 'ApplicantName', operator: QueryFilterOperator.Equals, value: applicant },
            ],
          },
          pageSize: 1,
        });

        const record = result.items?.[0] as any;
        if (!record) {
          setRecordError(`No record found in "${ENTITY_NAME}" for applicant "${applicant}".`);
          return;
        }

        setEntityId(entity.id);
        setRecordId(record.Id ?? record.id ?? null);
        setApproved(typeof record.Approved === 'boolean' ? record.Approved : null);
        setHasDocument(!!record[LOAN_DOCUMENT_FIELD]);
        setFormData((prev) => ({
          ...prev,
          applicantName: record.ApplicantName ?? prev.applicantName,
          loanAmount: record.LoanAmount ?? '',
          creditScore: record.CreditScore ?? '',
          riskFactor: record.RiskFactor ?? '',
          reviewerComments: record.ReviewerComments ?? '',
        }));
      } catch (err: unknown) {
        setRecordError(err instanceof Error ? err.message : 'Failed to load the applicant record.');
      } finally {
        setIsLoadingRecord(false);
      }
    };

    init();
  }, [onInitTheme]);

  // Download the Loan Document attachment only when switching to the document tab.
  useEffect(() => {
    if (activeTab !== 'document' || hasLoadedDocument) return;
    if (!entityId || !recordId || !hasDocument) return;
    let cancelled = false;

    const loadDocument = async () => {
      try {
        setIsLoadingDocument(true);
        setDocumentError(null);
        const blob = await uipath.entityService.downloadAttachment(entityId, recordId, LOAN_DOCUMENT_FIELD);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setDocumentUrl(url);
        setHasLoadedDocument(true);
      } catch (err: unknown) {
        if (!cancelled) {
          setDocumentError(err instanceof Error ? err.message : 'Failed to load document.');
          setHasLoadedDocument(true);
        }
      } finally {
        if (!cancelled) setIsLoadingDocument(false);
      }
    };

    loadDocument();
    return () => {
      cancelled = true;
    };
  }, [activeTab, hasLoadedDocument, entityId, recordId, hasDocument]);

  // Revoke the object URL on unmount.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const zoomIn  = () => setScale((s) => Math.min(2.5, parseFloat((s + 0.2).toFixed(1))));
  const zoomOut = () => setScale((s) => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))));
  const resetZoom = () => setScale(1.0);

  const handleDownload = async () => {
    if (!documentUrl) return;
    const fileName = `${formData.applicantName || 'loan'}-document.pdf`;
    const a = document.createElement('a');
    a.href = documentUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  // Update the Data Fabric record, then complete the Action Center task.
  const submitDecision = async (outcome: 'Approve' | 'Reject', approvedValue: boolean) => {
    // Pass only the fields this form owns (the original applicant data plus the
    // reviewer's inputs), so any extra properties from the task data are not echoed back.
    const { applicantName, loanAmount, creditScore, riskFactor, reviewerComments } = formData;
    const outputs = { applicantName, loanAmount, creditScore, riskFactor, reviewerComments };

    if (entityId && recordId) {
      try {
        setIsSubmitting(true);
        await uipath.entityService.updateRecordById(entityId, recordId, {
          RiskFactor: formData.riskFactor,
          ReviewerComments: formData.reviewerComments,
          Approved: approvedValue,
        });
        setApproved(approvedValue);
      } catch (err: unknown) {
        uipath.codedActionAppsService.showMessage(
          `Failed to update Data Fabric record: ${err instanceof Error ? err.message : 'unknown error'}`,
          MessageSeverity.Error,
        );
        setIsSubmitting(false);
        return;
      }
    }

    await uipath.codedActionAppsService.completeTask(outcome, outputs);
  };

  const handleApprove = () => submitDecision('Approve', true);
  const handleReject = () => submitDecision('Reject', false);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));

  const formatCurrency = (value: string | number) => {
    const n = Number(value);
    if (!value || Number.isNaN(n)) return value || '';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
  };

  const approvedLabel = approved === null ? '—' : approved ? 'Yes' : 'No';

  const riskFactorNum = Number(formData.riskFactor);
  const isRiskFactorValid = !!formData.riskFactor && riskFactorNum >= 0 && riskFactorNum <= 10;
  const isFormValid = !isReadOnly && !isSubmitting && !!recordId && isRiskFactorValid;

  return (
    <div className="review-app">
      <header className="review-header">
        <div className="review-header__icon" aria-hidden="true">
          <img src={documentIcon} alt="" width={32} height={32} style={{ borderRadius: 8 }} />
        </div>
        <div className="review-header__titles">
          <h1 className="review-header__title">Loan Application Review</h1>
          <p className="review-header__subtitle">
            Review the applicant details from Data Fabric, then record your decision.
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
            <img src={themeToggler} alt="" width={20} height={20} />
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
            {isLoadingRecord ? (
              <div className="loading-message">
                <div className="spinner"></div>
                Loading applicant record from Data Fabric…
              </div>
            ) : recordError ? (
              <div className="empty-message">{recordError}</div>
            ) : (
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
                    <div className="form-group">
                      <label htmlFor="approved">Approved</label>
                      <input id="approved" name="approved" value={approvedLabel} placeholder="—" readOnly />
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
          </>
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
                  {hasDocument
                    ? 'Document will load when the record is available.'
                    : 'No Loan Document attached to this record.'}
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
