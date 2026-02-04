-- Enable Realtime for communication_recipients
alter publication supabase_realtime add table communication_recipients;

-- Enable Realtime for enrollments (for document alerts)
alter publication supabase_realtime add table enrollments;
