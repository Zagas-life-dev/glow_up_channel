"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Copy, Upload, CheckCircle, Clock, XCircle, DollarSign, Building2, CreditCard } from "lucide-react"
import { toast } from "sonner"
import ApiClient from "@/lib/api-client"

interface PaymentDetailsProps {
  contentId: string
  contentType: string
  paymentStatus: string
  paymentAmount?: number
  paymentReference?: string
  paymentReceipt?: string
  paymentNotes?: string
  onStatusUpdate?: () => void
}

export default function PaymentDetails({
  contentId,
  contentType,
  paymentStatus,
  paymentAmount,
  paymentReference,
  paymentReceipt,
  paymentNotes,
  onStatusUpdate
}: PaymentDetailsProps) {
  const [receiptUrl, setReceiptUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const bankAccount = {
    bankName: "Access Bank",
    accountName: "Glow Up Channel Limited",
    accountNumber: "1234567890",
    accountType: "Current Account"
  }

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'awaiting_payment':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />Awaiting Payment</Badge>
      case 'payment_uploaded':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Upload className="h-3 w-3 mr-1" />Payment Uploaded</Badge>
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Payment Verified</Badge>
      case 'failed':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Payment Failed</Badge>
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">No Payment Required</Badge>
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleUploadReceipt = async () => {
    if (!receiptUrl.trim()) {
      toast.error('Please enter a receipt URL')
      return
    }

    try {
      setUploading(true)
      await ApiClient.uploadPaymentReceipt(contentId, contentType, receiptUrl)
      toast.success('Payment receipt uploaded successfully!')
      setShowUploadDialog(false)
      setReceiptUrl("")
      onStatusUpdate?.()
    } catch (error: any) {
      console.error('Error uploading receipt:', error)
      toast.error(error.message || 'Failed to upload receipt')
    } finally {
      setUploading(false)
    }
  }

  if (paymentStatus === 'not_required') {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          Complete payment to get your content approved
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          {getStatusBadge()}
        </div>

        {/* Payment Amount */}
        {paymentAmount && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Amount:</span>
            <span className="text-lg font-bold text-green-600">
              ₦{paymentAmount.toLocaleString()}
            </span>
          </div>
        )}

        {/* Payment Reference */}
        {paymentReference && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment Reference</Label>
            <div className="flex items-center gap-2">
              <Input
                value={paymentReference}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(paymentReference, 'Payment Reference')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Include this reference in your payment description
            </p>
          </div>
        )}

        {/* Bank Account Details */}
        {paymentStatus === 'awaiting_payment' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Account Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Bank Name:</span>
                  <span className="font-medium">{bankAccount.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Account Name:</span>
                  <span className="font-medium">{bankAccount.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{bankAccount.accountNumber}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(bankAccount.accountNumber, 'Account Number')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Account Type:</span>
                  <span className="font-medium">{bankAccount.accountType}</span>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Payment Instructions</h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Make a bank transfer to the account details above</li>
                <li>Include the Payment Reference in the transfer description</li>
                <li>Upload a screenshot or receipt of the payment</li>
                <li>Wait for admin verification (within 24 hours)</li>
              </ol>
            </div>

            {/* Upload Receipt Button */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Payment Receipt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Payment Receipt</DialogTitle>
                  <DialogDescription>
                    Upload a screenshot or receipt of your payment
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="receiptUrl">Receipt URL</Label>
                    <Input
                      id="receiptUrl"
                      placeholder="Paste the URL of your payment receipt image"
                      value={receiptUrl}
                      onChange={(e) => setReceiptUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload your receipt to an image hosting service and paste the URL here
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUploadReceipt}
                      disabled={uploading || !receiptUrl.trim()}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {uploading ? 'Uploading...' : 'Upload Receipt'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Payment Uploaded Status */}
        {paymentStatus === 'payment_uploaded' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Upload className="h-4 w-4" />
              <span className="font-medium">Payment Receipt Uploaded</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Your payment receipt has been uploaded and is awaiting admin verification.
            </p>
            {paymentReceipt && (
              <div className="mt-2">
                <a
                  href={paymentReceipt}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View uploaded receipt
                </a>
              </div>
            )}
          </div>
        )}

        {/* Payment Verified Status */}
        {paymentStatus === 'verified' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Payment Verified</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your payment has been verified and your content will be approved shortly.
            </p>
          </div>
        )}

        {/* Payment Failed Status */}
        {paymentStatus === 'failed' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">Payment Verification Failed</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              {paymentNotes || 'Your payment could not be verified. Please contact support.'}
            </p>
          </div>
        )}

        {/* Payment Notes */}
        {paymentNotes && paymentStatus !== 'failed' && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">Admin Notes</h4>
            <p className="text-sm text-gray-700">{paymentNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}




