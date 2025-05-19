// app/landing/page.tsx

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LandingPage() {
    return (
        <main className="flex flex-col items-center justify-center px-6 py-12 md:py-20 space-y-16">
            {/* Hero Section */}
            <section className="max-w-3xl text-center space-y-6">
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                    Your Labs, Finally Explained
                </h1>
                <p className="text-lg text-muted-foreground">
                    Upload your medical test results.<br />
                    We’ll translate them into insights that make sense — and matter.
                </p>
                <p className="text-muted-foreground">
                    Whether you're curious, proactive, or already tracking your health — we turn medical data into clear insights and a smarter plan for what’s next.
                </p>
                <Button className="text-lg px-6 py-4">Join the waitlist</Button>
            </section>

            {/* What You Get Section */}
            <section className="max-w-5xl w-full space-y-12">
                <h2 className="text-3xl font-semibold text-center">What You Get</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <h3 className="text-xl font-semibold">See your trends</h3>
                            <p className="text-muted-foreground">
                                Track how your key markers change over time. No more guessing — just clear, simple visuals.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <h3 className="text-xl font-semibold">Know your risks</h3>
                            <p className="text-muted-foreground">
                                Get a personalized risk profile based on your data — powered by medical research and machine learning.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <h3 className="text-xl font-semibold">Your health plan</h3>
                            <p className="text-muted-foreground">
                                Receive a tailored plan that shows what to do next — tests to run, questions to ask your doctor, and actions to take today.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Preventive Health Message */}
            <section className="max-w-3xl text-center space-y-4">
                <h2 className="text-2xl font-semibold">Built for preventive health</h2>
                <p className="text-muted-foreground">
                    Most health issues don’t start overnight — they build up quietly, over years. We help you catch them before they become a problem.
                </p>
                <p className="text-muted-foreground">
                    This is preventive medicine, powered by your own data.
                </p>
            </section>

            {/* Who It's For */}
            <section className="max-w-4xl text-center space-y-4">
                <h2 className="text-2xl font-semibold">Who It’s For</h2>
                <p className="text-muted-foreground">
                    anyone who believes prevention is better than cure • people who want more from their checkups • athletes and biohackers • anyone managing chronic symptoms • those with a family history of disease
                </p>
            </section>

            {/* Pricing */}
            <section className="max-w-5xl space-y-8">
                <h2 className="text-3xl font-semibold text-center">Simple pricing</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <h3 className="text-xl font-semibold">1. Track</h3>
                            <p className="text-muted-foreground">Upload your lab results and see your biomarker trends</p>
                            <p className="font-bold">$49 one-time</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <h3 className="text-xl font-semibold">2. Understand</h3>
                            <p className="text-muted-foreground">Includes everything in Track, plus risk analysis and red flag detection</p>
                            <p className="font-bold">$99 one-time</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <h3 className="text-xl font-semibold">3. Act</h3>
                            <p className="text-muted-foreground">Everything above, plus your personalized Health Plan: what to test next, how to reduce risks, what to focus on now</p>
                            <p className="font-bold">$179 one-time</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* How It Works */}
            <section className="max-w-3xl space-y-6 text-center">
                <h2 className="text-2xl font-semibold">How It Works</h2>
                <ol className="space-y-2 text-muted-foreground">
                    <li><strong>1. Upload your labs:</strong> PDF, screenshot, or from your provider — we support them all.</li>
                    <li><strong>2. Let the AI do the work:</strong> We scan your biomarkers, highlight what matters, and track your changes over time.</li>
                    <li><strong>3. Get your insights:</strong> Receive a clear summary of your health risks — and a plan for what to do next.</li>
                </ol>
            </section>

            {/* Security and Science */}
            <section className="max-w-3xl text-center space-y-6">
                <h2 className="text-2xl font-semibold">Is my data safe?</h2>
                <p className="text-muted-foreground">
                    Absolutely. Your data is encrypted and never shared. You control what you upload — and you can delete it anytime.
                </p>
                <h2 className="text-2xl font-semibold">Backed by science</h2>
                <p className="text-muted-foreground">
                    Our models are built on peer-reviewed research, clinical guidelines, and validated biomarker thresholds.
                    We combine the precision of AI with the standards of preventive medicine.
                </p>
            </section>

            {/* Final CTA */}
            <section className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">Ready to get started?</h2>
                <p className="text-muted-foreground">All we need is your latest bloodwork. PDF or screenshot — we’ll take care of the rest.</p>
                <Button className="text-lg px-6 py-4">Join the waitlist</Button>
            </section>
        </main>
    )
}
