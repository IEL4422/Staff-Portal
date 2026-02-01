import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  FileText, File, CheckCircle, Loader2, AlertCircle, ArrowLeft,
  User, Calendar, Clock, Table, Type
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { approvalsApi } from '../services/documentsApi';

const DocumentApprovalPage = () => {
  const { approvalId } = useParams();
  const navigate = useNavigate();
  
  const [approval, setApproval] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchApprovalDetails();
  }, [approvalId]);

  useEffect(() => {
    if (approval) {
      fetchDocumentPreview();
    }
  }, [approval]);

  const fetchApprovalDetails = async () => {
    setLoading(true);
    try {
      const result = await approvalsApi.getApprovalDetails(approvalId);
      setApproval(result.data);
    } catch (error) {
      console.error('Failed to fetch approval details:', error);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentPreview = async () => {
    setLoadingPreview(true);
    try {
      const result = await approvalsApi.getDocumentPreview(approvalId);
      setPreview(result.data);
    } catch (error) {
      console.error('Failed to fetch document preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const result = await approvalsApi.approveDocument(approvalId);
      toast.success(result.data.message);
      setApproval(prev => ({ ...prev, status: 'APPROVED' }));
    } catch (error) {
      console.error('Failed to approve document:', error);
      toast.error('Failed to approve document');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Document Not Found</h2>
            <p className="text-sm text-slate-500 mt-2">This approval link may have expired or is invalid.</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApproved = approval.status === 'APPROVED';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <Card className={isApproved ? 'border-green-300' : 'border-orange-300'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isApproved ? 'bg-green-100' : 'bg-orange-100'}`}>
                  {isApproved ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <FileText className="w-6 h-6 text-orange-600" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">{approval.template_name}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {approval.matter_name}
                    </span>
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant={isApproved ? 'default' : 'outline'} 
                className={isApproved ? 'bg-green-500' : 'border-orange-400 text-orange-600'}
              >
                {isApproved ? 'APPROVED' : 'PENDING APPROVAL'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Drafted by</p>
                <p className="font-medium">{approval.drafter_name}</p>
              </div>
              <div>
                <p className="text-slate-500">Submitted</p>
                <p className="font-medium">
                  {approval.created_at ? format(new Date(approval.created_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
                </p>
              </div>
              {isApproved && (
                <>
                  <div>
                    <p className="text-slate-500">Approved by</p>
                    <p className="font-medium">{approval.approved_by}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Approved on</p>
                    <p className="font-medium">
                      {approval.approved_at ? format(new Date(approval.approved_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document Preview
              {preview?.filename && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {preview.filename}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
                <span className="ml-2 text-slate-500">Loading preview...</span>
              </div>
            ) : preview?.success ? (
              <div className="border rounded-lg bg-white max-h-[500px] overflow-y-auto">
                {/* DOCX Preview */}
                {preview.file_type === 'docx' && (
                  <div className="p-6 space-y-4">
                    {preview.paragraphs?.map((para, index) => (
                      <div key={index} className={`
                        ${para.style?.includes('Heading 1') ? 'text-xl font-bold text-slate-800' : ''}
                        ${para.style?.includes('Heading 2') ? 'text-lg font-semibold text-slate-700' : ''}
                        ${para.style?.includes('Heading 3') ? 'text-base font-medium text-slate-700' : ''}
                        ${para.style === 'Normal' || !para.style?.includes('Heading') ? 'text-sm text-slate-600' : ''}
                      `}>
                        {para.text}
                      </div>
                    ))}
                    
                    {/* Tables */}
                    {preview.tables?.map((table, tableIndex) => (
                      <div key={`table-${tableIndex}`} className="mt-4 overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-200 text-sm">
                          <tbody>
                            {table.map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-100' : ''}>
                                {row.map((cell, cellIndex) => (
                                  <td 
                                    key={cellIndex} 
                                    className="border border-slate-200 px-3 py-2"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    
                    {preview.paragraphs?.length === 0 && preview.tables?.length === 0 && (
                      <p className="text-slate-500 text-center py-8">No content found in document</p>
                    )}
                  </div>
                )}
                
                {/* PDF Preview */}
                {preview.file_type === 'pdf' && (
                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <File className="w-4 h-4" />
                      <span>{preview.page_count} page(s)</span>
                    </div>
                    {preview.pages?.map((pageText, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0">
                        <Badge variant="outline" className="mb-2 text-xs">Page {index + 1}</Badge>
                        <div className="text-sm text-slate-600 whitespace-pre-wrap font-mono">
                          {pageText}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center bg-slate-50">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">
                  {preview?.error || 'Unable to load document preview'}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  The document file may have been moved or is inaccessible
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Actions */}
        {!isApproved && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-orange-800">Ready to Approve?</h3>
                  <p className="text-sm text-orange-600 mt-1">
                    Approving this document will notify the drafter ({approval.drafter_name}) via Slack and staff portal.
                  </p>
                </div>
                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {approving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Document
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Approved Message */}
        {isApproved && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Document Approved</h3>
                  <p className="text-sm text-green-600 mt-1">
                    This document was approved by {approval.approved_by} on {approval.approved_at ? format(new Date(approval.approved_at), 'MMMM d, yyyy') : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DocumentApprovalPage;
