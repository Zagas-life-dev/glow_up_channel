"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface EventFormData {
  name: string
  email: string
  title: string
  description: string
  date: string
  time: string
  location: string
  location_type: string
  is_free: boolean
  link: string
  status: string
}

export default function EventSubmissionForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [eventForm, setEventForm] = useState<EventFormData>({
    name: "",
    email: "",
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    location_type: "online",
    is_free: true,
    link: "",
    status: "pending"
  })

  const handleEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEventForm((prev) => ({ ...prev, [name]: value }))
  }

  const checkEventFormValidity = () => {
    return (
      eventForm.name.trim() !== "" &&
      eventForm.email.trim() !== "" &&
      eventForm.title.trim() !== "" &&
      eventForm.description.trim() !== "" &&
      eventForm.date.trim() !== "" &&
      eventForm.time.trim() !== "" &&
      eventForm.location.trim() !== "" &&
      eventForm.link.trim() !== ""
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    if (!checkEventFormValidity()) {
      setError("Please fill in all required fields")
      setLoading(false)
      return
    }
    
    try {
      // Format the time properly - make sure it's in 24h format (HH:MM)
      let formattedTime = eventForm.time;
      
      // Check if the time is in the correct format (HH:MM or HH:MM AM/PM)
      if (!formattedTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        // Try to handle AM/PM format
        const timeMatch = formattedTime.match(/^([0-1]?[0-9]):([0-5][0-9])\s*(AM|PM|am|pm)$/);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2];
          const period = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        } else {
          throw new Error("Invalid time format. Please use HH:MM or HH:MM AM/PM format (e.g., 09:00 or 09:00 AM)");
        }
      }
      
      // For validation only - not sending this to the server
      const dateForValidation = new Date(`${eventForm.date}T${formattedTime}`);
      
      if (isNaN(dateForValidation.getTime())) {
        throw new Error("Invalid date or time format")
      }

      // TODO: Implement event submission with your backend API
      toast.error("Feature not available", {
        description: "Event submission needs to be implemented with your backend API."
      });

      // Reset form after submission attempt
      setEventForm({
        name: "",
        email: "",
        title: "",
        description: "",
        date: "",
        time: "",
        location: "",
        location_type: "online",
        is_free: true,
        link: "",
        status: "pending"
      });
      
    } catch (error: any) {
      console.error("Submission error:", error);
      setError(error.message || "Failed to submit event");
      toast.error("Error submitting event", {
        description: error.message || "Please try again later."
      });
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit an Event</CardTitle>
        <CardDescription>
          Share details about an upcoming event that would benefit our community.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Your Name</Label>
              <Input
                id="event-name"
                name="name"
                value={eventForm.name}
                onChange={handleEventChange}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-email">Your Email</Label>
              <Input
                id="event-email"
                name="email"
                type="email"
                value={eventForm.email}
                onChange={handleEventChange}
                placeholder="Your email address"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-title">Event Title</Label>
            <Input
              id="event-title"
              name="title"
              value={eventForm.title}
              onChange={handleEventChange}
              placeholder="Title of your event"
                required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Event Description</Label>
            <Textarea
              id="event-description"
              name="description"
              value={eventForm.description}
              onChange={handleEventChange}
              placeholder="Describe your event"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                name="date"
                type="date"
                value={eventForm.date}
                onChange={handleEventChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                name="time"
                placeholder="Enter time (09:00 AM)"
                value={eventForm.time}
                onChange={handleEventChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                name="location"
                value={eventForm.location}
                onChange={handleEventChange}
                placeholder="e.g., New York, USA or Zoom"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location Type</Label>
              <RadioGroup
                value={eventForm.location_type}
                onValueChange={(value) => setEventForm((prev) => ({ ...prev, location_type: value }))}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online">Online</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="physical" id="physical" />
                  <Label htmlFor="physical">Physical</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hybrid" id="hybrid" />
                  <Label htmlFor="hybrid">Hybrid</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Is it Free or Paid?</Label>
              <RadioGroup
                value={eventForm.is_free ? "free" : "paid"}
                onValueChange={(value) => setEventForm((prev) => ({ 
                  ...prev, 
                  is_free: value === "free" 
                }))}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free" id="event-free" />
                  <Label htmlFor="event-free">Free</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="event-paid" />
                  <Label htmlFor="event-paid">Paid</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-link">Registration/Info Link</Label>
            <Input
              id="event-link"
              name="link"
              type="url"
              value={eventForm.link}
              onChange={handleEventChange}
              placeholder="https://..."
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Submit Event"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <p>
          By submitting, you agree to our{" "}
          <a href="/terms" className="text-blue-500 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-blue-500 hover:underline">
            Privacy Policy
          </a>.
        </p>
      </CardFooter>
    </Card>
  )
}