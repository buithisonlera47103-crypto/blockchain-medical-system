/**
 * 共享数据验证模式
 * 前后端统一使用的验证规则
 */
export declare const BaseValidation: {
    id: any;
    optionalId: any;
    nonEmptyString: any;
    optionalString: any;
    shortString: any;
    mediumString: any;
    longString: any;
    email: any;
    optionalEmail: any;
    password: any;
    phone: any;
    date: any;
    optionalDate: any;
    pastDate: any;
    futureDate: any;
    userRole: any;
    recordType: any;
    priority: any;
    status: any;
    fileSize: any;
    fileName: any;
    fileType: any;
    boolean: any;
    optionalBoolean: any;
    positiveNumber: any;
    nonNegativeNumber: any;
    percentage: any;
    url: any;
    jsonObject: any;
    stringArray: any;
    idArray: any;
};
export declare const UserValidation: {
    register: any;
    login: any;
    updateProfile: any;
    changePassword: any;
    search: any;
};
export declare const MedicalRecordValidation: {
    create: any;
    update: any;
    search: any;
    accessControl: any;
};
export declare const FileValidation: {
    upload: any;
    updateInfo: any;
};
export declare const SystemValidation: {
    settings: any;
    monitoring: any;
};
export declare const ApiValidation: {
    pagination: any;
    idParam: any;
    batchOperation: any;
    search: any;
};
export declare const formatValidationError: (error: any) => {
    message: string;
    details: any;
};
export declare const createValidator: (schema: any) => {
    body: (data: any) => any;
    query: (data: any) => any;
    params: (data: any) => any;
};
export declare const Validators: {
    User: {
        register: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        login: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        updateProfile: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        changePassword: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        search: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
    };
    MedicalRecord: {
        create: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        update: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        search: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        accessControl: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
    };
    File: {
        upload: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        updateInfo: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
    };
    System: {
        settings: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        monitoring: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
    };
    Api: {
        pagination: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        idParam: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        batchOperation: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
        search: {
            body: (data: any) => any;
            query: (data: any) => any;
            params: (data: any) => any;
        };
    };
};
//# sourceMappingURL=schemas.d.ts.map