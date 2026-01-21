import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, GraduationCap, Calendar, FileText, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Class {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

interface ExamWizardProps {
  classes: Class[];
  academicYears: AcademicYear[];
  selectedClassId: string | null;
  selectedSessionId: string | null;
  selectedExamType: string | null;
  onClassSelect: (classId: string) => void;
  onSessionSelect: (sessionId: string) => void;
  onExamTypeSelect: (examType: string) => void;
  onReset: () => void;
}

const EXAM_TYPES = [
  { value: "midterm", label: "Mid-Term", description: "Mid-semester examination" },
  { value: "final", label: "Final Term", description: "End of semester examination" },
  { value: "quiz", label: "Class Test / Quiz", description: "Short assessment" },
  { value: "assignment", label: "Assignment", description: "Take-home work" },
  { value: "practical", label: "Practical", description: "Lab or hands-on exam" },
];

const ExamWizard = ({
  classes,
  academicYears,
  selectedClassId,
  selectedSessionId,
  selectedExamType,
  onClassSelect,
  onSessionSelect,
  onExamTypeSelect,
  onReset,
}: ExamWizardProps) => {
  const currentStep = !selectedClassId ? 1 : !selectedSessionId ? 2 : !selectedExamType ? 3 : 4;

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSession = academicYears.find(a => a.id === selectedSessionId);
  const selectedExamTypeData = EXAM_TYPES.find(e => e.value === selectedExamType);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[
          { step: 1, label: "Class", icon: GraduationCap },
          { step: 2, label: "Session", icon: Calendar },
          { step: 3, label: "Exam Type", icon: FileText },
        ].map(({ step, label, icon: Icon }, index) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                currentStep === step && "bg-primary text-primary-foreground",
                currentStep > step && "bg-primary/20 text-primary",
                currentStep < step && "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > step ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">{label}</span>
            </div>
            {index < 2 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Selection Summary (when selections made) */}
      {(selectedClassId || selectedSessionId || selectedExamType) && currentStep < 4 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onReset} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Start Over
          </Button>
          {selectedClass && (
            <Badge variant="secondary" className="text-sm py-1">
              Class: {selectedClass.name}
            </Badge>
          )}
          {selectedSession && (
            <Badge variant="secondary" className="text-sm py-1">
              Session: {selectedSession.name}
            </Badge>
          )}
          {selectedExamTypeData && (
            <Badge variant="secondary" className="text-sm py-1">
              Type: {selectedExamTypeData.label}
            </Badge>
          )}
        </div>
      )}

      {/* Step 1: Select Class */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Select a Class</h2>
          <p className="text-muted-foreground text-center">Choose the class to view or manage exams</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => onClassSelect(cls.id)}
              >
                <CardContent className="p-6 text-center">
                  <GraduationCap className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-lg">{cls.name}</h3>
                </CardContent>
              </Card>
            ))}
            {classes.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No classes found. Please create classes first.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select Academic Session */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Select Academic Session</h2>
          <p className="text-muted-foreground text-center">Choose the academic year to filter exams</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {academicYears.map((year) => (
              <Card
                key={year.id}
                className={cn(
                  "cursor-pointer hover:shadow-lg hover:border-primary transition-all",
                  year.is_current && "border-primary/50"
                )}
                onClick={() => onSessionSelect(year.id)}
              >
                <CardContent className="p-6 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-lg">{year.name}</h3>
                  {year.is_current && (
                    <Badge className="mt-2" variant="default">Current</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            {academicYears.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No academic sessions found. Please create sessions first.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Select Exam Type */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Select Exam Type</h2>
          <p className="text-muted-foreground text-center">Choose the type of examination</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {EXAM_TYPES.map((examType) => (
              <Card
                key={examType.value}
                className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => onExamTypeSelect(examType.value)}
              >
                <CardContent className="p-6">
                  <FileText className="h-8 w-8 mb-3 text-primary" />
                  <h3 className="font-semibold text-lg">{examType.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{examType.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamWizard;
