"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ApiClient } from "@/lib/api-client"
import { RiCalendarLine } from "react-icons/ri"

interface OpportunityFormData {
  submitter_name: string
  submitter_email: string
  title: string
  description: string
  deadline: string
  eligibility: string
  category: string
  link: string
  status: string
}

export default function OpportunitySubmissionForm() {
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [opportunityForm, setOpportunityForm] = useState<OpportunityFormData>({
    submitter_name: "",
    submitter_email: "",
    title: "",
    description: "",
    deadline: "",
    eligibility: "",
    category: "",
    link: "",
    status: "pending"
  })

  const handleOpportunityChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setOpportunityForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      setOpportunityForm(prev => ({
        ...prev,
        deadline: format(date, "yyyy-MM-dd")
      }))
    }
  }

  const checkOpportunityFormValidity = () => {
    return (
      opportunityForm.submitter_name.trim() !== "" &&
      opportunityForm.submitter_email.trim() !== "" &&
      opportunityForm.title.trim() !== "" &&
      opportunityForm.description.trim() !== "" &&
      opportunityForm.deadline.trim() !== "" &&
      opportunityForm.eligibility.trim() !== "" &&
      opportunityForm.category.trim() !== "" &&
      opportunityForm.link.trim() !== ""
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    if (!checkOpportunityFormValidity()) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields"
      })
      setLoading(false)
      return
    }
    
    try {
      // Map form data to backend format
      const opportunityData = {
        title: opportunityForm.title.trim(),
        description: opportunityForm.description.trim(),
        url: opportunityForm.link.trim(),
        category: opportunityForm.category,
        type: opportunityForm.category, // Using category as type for now
        provider: opportunityForm.submitter_name.trim(),
        location: {
          isRemote: false // Default, can be enhanced later
        },
        requirements: {
          other: opportunityForm.eligibility.trim()
        },
        dates: {
          applicationDeadline: opportunityForm.deadline ? new Date(opportunityForm.deadline).toISOString() : null
        },
        status: 'active',
        isApproved: false // Requires admin approval
      }

      await ApiClient.createOpportunity(opportunityData)
      
      toast.success("Opportunity Submitted", {
        description: "Your opportunity has been submitted successfully and is pending approval."
      })
      
      // Reset form
      setOpportunityForm({
        submitter_name: "",
        submitter_email: "",
        title: "",
        description: "",
        deadline: "",
        eligibility: "",
        category: "",
        link: "",
        status: "pending"
      })
      setSelectedDate(undefined)
    } catch (error: any) {
      const errorMessage = error.message || "Failed to submit opportunity. Please try again."
      
      // Handle specific error cases
      if (errorMessage.includes('Authentication') || errorMessage.includes('token')) {
        toast.error("Authentication Required", {
          description: "Please log in to submit an opportunity."
        })
      } else if (errorMessage.includes('DUPLICATE_TITLE') || errorMessage.includes('already exists')) {
        toast.error("Duplicate Opportunity", {
          description: "An opportunity with this title already exists. Please use a different title."
        })
      } else if (errorMessage.includes('Validation failed')) {
        toast.error("Validation Error", {
          description: "Please check your input and try again."
        })
      } else {
        toast.error("Submission Failed", {
          description: errorMessage
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit an Opportunity</CardTitle>
        <CardDescription>
          Share details about an opportunity that would benefit our community.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="submitter_name">Your Name</Label>
              <Input
                id="submitter_name"
                name="submitter_name"
                value={opportunityForm.submitter_name}
                onChange={handleOpportunityChange}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submitter_email">Your Email</Label>
              <Input
                id="submitter_email"
                name="submitter_email"
                type="email"
                value={opportunityForm.submitter_email}
                onChange={handleOpportunityChange}
                placeholder="Your email address"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Opportunity Title</Label>
            <Input
              id="title"
              name="title"
              value={opportunityForm.title}
              onChange={handleOpportunityChange}
              placeholder="Title of the opportunity"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opportunity Description</Label>
            <Textarea
              id="description"
              name="description"
              value={opportunityForm.description}
              onChange={handleOpportunityChange}
              placeholder="Describe the opportunity"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <RiCalendarLine className="mr-2 h-4 w-4" aria-hidden />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eligibility">Eligibility</Label>
              <Input
                id="eligibility"
                name="eligibility"
                value={opportunityForm.eligibility}
                onChange={handleOpportunityChange}
                placeholder="Who can apply?"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={opportunityForm.category}
                onValueChange={(value) => setOpportunityForm((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="fellowship">Fellowship</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="mentorship">Mentorship</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Application/Info Link</Label>
              <Input
                id="link"
                name="link"
                type="url"
                value={opportunityForm.link}
                onChange={handleOpportunityChange}
                placeholder="https://..."
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Submit Opportunity"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <p>
          By submitting, you agree to our{" "}
          <a href="/terms" className="text-primary hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>.
        </p>
      </CardFooter>
    </Card>
  )
}