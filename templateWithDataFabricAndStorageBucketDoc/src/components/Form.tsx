import { useState, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import './Form.css';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { resolveAssetUrl } from './utils';
import companyLogo  from '../assets/react.svg'
import { ActionCenterData, MessageTypes } from '@uipath/coded-action-apps';
import uipath from '../uipath';
import { AttachmentResponse } from '@uipath/uipath-typescript/attachments';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LoanApplicationFile {
  ID: string;
  FullName: string;
  MimeType: string;
}

interface FormData {
  applicantName: string;
  loanAmount: string;
  creditScore: string;
  riskFactor: string;
  reviewerComments: string;
  loanDocumentFile: LoanApplicationFile | null;
}

interface LoanHistory {
  id: number;
  loanType: string;
  amount: number;
  processingDate: string;
  status: string;
  duration: string;
}

type TabType = 'review' | 'applicant' | 'application';

const Form = () => {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [formData, setFormData] = useState<FormData>({
    applicantName: '',
    loanAmount: '',
    creditScore: '',
    riskFactor: '',
    reviewerComments: '',
    loanDocumentFile: null,
  });
  const [loanHistory, setLoanHistory] = useState<LoanHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [hasLoadedDocument, setHasLoadedDocument] = useState(false);

  useEffect(() => {
    const taskData = async () => { 
      const taskData = await uipath.codedActionAppsService.getTaskDetailsFromActionCenter() as ActionCenterData;
      setFormData(taskData.data as FormData);
    }

    taskData();
  }, []);

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
      const loadDocument = async () => {
        // Check if required data is available
        console.log('loading doc', formData);
        if (formData.loanDocumentFile && formData.loanDocumentFile.ID) {
          try {
            setIsLoadingDocument(true);
            console.log('Fetching attachment...');
            const attachmentResponse = await uipath.attachmentService.getById(formData.loanDocumentFile.ID);
            console.log('Attachment response:', attachmentResponse);

            // The response contains the read URI
            if (attachmentResponse && (attachmentResponse as AttachmentResponse).blobFileAccess.uri) {
              const readUri = (attachmentResponse as AttachmentResponse).blobFileAccess.uri;
              console.log('Read URI:', readUri);
              setDocumentUrl(readUri);
            } else {
              console.error('No URI found in attachment response');
            }
            setHasLoadedDocument(true);
          } catch (error) {
            console.error('Error fetching document URL:', error);
            uipath.codedActionAppsService.displayMessageInActionCenter('Error fetching document ' + JSON.stringify(error), MessageTypes.Error);
            setHasLoadedDocument(true);
          } finally {
            setIsLoadingDocument(false);
          }
        }
      };

      loadDocument();
    }
  }, [activeTab, hasLoadedDocument, isLoadingDocument, formData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedData = {
      ...formData,
      [name]: value
    }
    setFormData(updatedData);
    uipath.codedActionAppsService.notifyDataChangedToActionCenter(updatedData);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Prevent decimal point (.) and 'e' from being entered in Risk Factor field
    if (e.currentTarget.name === 'riskFactor' && (e.key === '.' || e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleAccept = () => {
    console.log('Form accepted:', formData);
    uipath.codedActionAppsService.completeTaskInActionCenter('Accept', formData);
  };

  const handleReject = () => {
    console.log('Form rejected:', formData);
    uipath.codedActionAppsService.completeTaskInActionCenter('Reject', formData);
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

  // Check if required fields are filled
  const isFormValid = formData.riskFactor && formData.riskFactor !== '';

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="form-header">
          <div className="form-header-content">
            <div className="form-header-logo">
              <img src={resolveAssetUrl(companyLogo)} alt="React Logo" width="48" height="48" />
            </div>
            <div className="form-header-title">
              <h1>Loan Application Review</h1>
              <p>Review and approve loan applications</p>
            </div>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="tabs-container">
          {/* Tab Navigation */}
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

        {/* Tab Content */}
        <div className="tab-content">
          {/* Review Application Tab */}
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
                <label htmlFor="riskFactor">Risk Factor</label>
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

          {/* Attachments Tab */}
          {activeTab === 'application' && (
            <div className="tab-panel">
              <h2>Attachments</h2>
              <div className="application-image-container">
                <div className="pdf-viewer-box">
                  {isLoadingDocument ? (
                    <div className="loading-message">
                      <div className="spinner"></div>
                      Loading document...
                    </div>
                  ) : documentUrl ? (
                    <Document
                      file={documentUrl}
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
                  ) : (
                    <div className="empty-message">No document available</div>
                  )}
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