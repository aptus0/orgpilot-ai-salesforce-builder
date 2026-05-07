public with sharing class SmartCreditFlowActions {
    public class CollectionsBucketRequest {
        @InvocableVariable(required=true)
        public Integer daysPastDue;
    }

    public class CollectionsBucketResponse {
        @InvocableVariable
        public String bucket;
    }

    @InvocableMethod(label='Resolve DPD Bucket' description='Maps days past due to SmartCredit 360 collection buckets.')
    public static List<CollectionsBucketResponse> resolveCollectionsBucket(
        List<CollectionsBucketRequest> requests
    ) {
        List<CollectionsBucketResponse> responses = new List<CollectionsBucketResponse>();

        for (CollectionsBucketRequest request : requests) {
            CollectionsBucketResponse response = new CollectionsBucketResponse();
            Integer dpd = request.daysPastDue == null ? 0 : request.daysPastDue;

            if (dpd >= 120) {
                response.bucket = 'Charge-Off';
            } else if (dpd >= 90) {
                response.bucket = '90DPD';
            } else if (dpd >= 60) {
                response.bucket = '60DPD';
            } else if (dpd >= 30) {
                response.bucket = '30DPD';
            } else if (dpd > 0) {
                response.bucket = 'Current';
            } else {
                response.bucket = 'Current';
            }

            responses.add(response);
        }

        return responses;
    }
}
