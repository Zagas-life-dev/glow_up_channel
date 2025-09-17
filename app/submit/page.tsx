"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EventSubmissionForm from "@/components/forms/event-submission-form"
import OpportunitySubmissionForm from "@/components/forms/opportunity-submission-form"

export default function SubmitPage() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")
  const [activeTab, setActiveTab] = useState<string>(typeParam === "opportunity" ? "opportunity" : "event")

  useEffect(() => {
    if (typeParam === "opportunity" || typeParam === "event") {
      setActiveTab(typeParam)
    }
  }, [typeParam])

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-muted py-12">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">Submit</h1>
            <p className="text-muted-foreground max-w-[700px]">
              Share an event or opportunity with our community. All submissions are reviewed before publishing.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="container px-4 md:px-6 max-w-3xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="event">Submit an Event</TabsTrigger>
              <TabsTrigger value="opportunity">Submit an Opportunity</TabsTrigger>
            </TabsList>

            <TabsContent value="event">
              <EventSubmissionForm />
            </TabsContent>

            <TabsContent value="opportunity">
              <OpportunitySubmissionForm />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}
