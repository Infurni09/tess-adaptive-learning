import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Target, TrendingUp, Brain, Zap, BarChart3 } from "lucide-react";
import heroImage from "@assets/generated_images/Educational_technology_hero_image_fd6ac6c3.png";

export default function Landing() {
  const features = [
    {
      icon: Brain,
      title: "Diagnostic Testing",
      description: "Three comprehensive assessments to accurately identify your knowledge level and learning needs.",
    },
    {
      icon: Target,
      title: "Adaptive Practice",
      description: "Intelligent question selection that adapts to your performance and focuses on areas needing improvement.",
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Detailed insights into your progress with visual charts showing strengths and areas for growth.",
    },
  ];

  const benefits = [
    "Personalized learning paths based on diagnostic results",
    "Real-time performance tracking across all topics",
    "Targeted practice sessions for maximum efficiency",
    "Comprehensive progress analytics and insights",
    "Study streak tracking to build consistent habits",
  ];

  return (
    <div className="min-h-screen">
      <div className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Master Learning with
            <span className="block text-primary mt-2">Targeted Education</span>
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            TESS uses advanced adaptive algorithms to analyze your performance and provide personalized practice sessions that accelerate your learning.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8" data-testid="button-get-started">
                Get Started Free
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 bg-background/20 backdrop-blur border-white/30 text-white hover:bg-background/30" 
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Intelligent Learning Platform</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Combining diagnostic assessment with adaptive practice for optimal learning outcomes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 hover-elevate transition-all">
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-2xl p-12 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">How TESS Works</h2>
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">1</div>
                  <div>
                    <h4 className="font-semibold mb-1">Complete Diagnostic Tests</h4>
                    <p className="text-muted-foreground text-sm">Take three comprehensive assessments to establish your baseline knowledge across all topics.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">2</div>
                  <div>
                    <h4 className="font-semibold mb-1">Get Personalized Insights</h4>
                    <p className="text-muted-foreground text-sm">Our system analyzes your performance and identifies strengths and areas for improvement.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Practice Targeted Questions</h4>
                    <p className="text-muted-foreground text-sm">Receive adaptive practice sessions focused on topics where you need the most support.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">4</div>
                  <div>
                    <h4 className="font-semibold mb-1">Track Your Progress</h4>
                    <p className="text-muted-foreground text-sm">Monitor your improvement with detailed analytics and performance visualizations.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div>
              <Card className="p-8">
                <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>

        <div className="text-center bg-primary/5 rounded-2xl p-12">
          <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning Smarter?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are achieving better results with personalized, adaptive learning.
          </p>
          <Link href="/register">
            <Button size="lg" className="text-lg px-8" data-testid="button-cta-bottom">
              Create Free Account
            </Button>
          </Link>
        </div>
      </div>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2024 TESS. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover-elevate px-2 py-1 rounded">Privacy Policy</a>
              <a href="#" className="hover-elevate px-2 py-1 rounded">Terms of Service</a>
              <a href="#" className="hover-elevate px-2 py-1 rounded">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
