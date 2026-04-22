# # # from typing import Optional

# # # from pydantic import BaseModel,Field,field_validator

# # # class ProductCreate(BaseModel):
# # #     barcode:str=Field(...,min_length=2)
# # #     product_name:Optional[str]=Field(None,min_length=2)
# # #     description:Optional[str]=Field(None,min_length=5)
# # #     quantity:int=Field(...,gt=0)
# # #     unit_of_measure:Optional[str]=None
# # #     unit_price:Optional[float] =Field(None,gt=0)

# # #     @field_validator("barcode","product_name","description",mode="before")
    
# # #     def validate_fields(cls,value):
# # #         if value is None:
# # #             return value
# # #         if  value.strip().lower()=="string":
# # #             raise ValueError("Invalid value: 'string' is not allowed")
# # #         return value
    

# # # class ProductSell(BaseModel):
# # #     quantity:int=Field(...,ge=0) 
# # #     unit_of_measure:Optional[str]=None

# # # class ProductUpdate(BaseModel):
# # #     product_name: Optional[str]
# # #     description: Optional[str]
# # #     quantity: int
# # #     unit_of_measure: str
# # #     unit_price: Optional[float] = Field(None, gt=0)

    
# # from typing import Optional
# # from pydantic import BaseModel, Field, field_validator


# # #CREATE 
# # class ProductCreate(BaseModel):
# #     barcode: str = Field(..., min_length=2)
# #     product_name: str = Field(..., min_length=2)
# #     description: str = Field(..., min_length=5)
# #     quantity: float = Field(..., gt=0)
# #     unit_of_measure: str  # REQUIRED
# #     unit_price: float = Field(..., gt=0)

# #     @field_validator("barcode", "product_name", "description", mode="before")
# #     def validate_fields(cls, value):
# #         if value is None:
# #             return value
# #         if value.strip().lower() == "string":
# #             raise ValueError("Invalid value: 'string' is not allowed")
# #         return value


# # # UPDATE (STOCK ADD / EDIT)
# # class ProductUpdate(BaseModel):
# #     product_name: Optional[str] = Field(None, min_length=2)
# #     description: Optional[str] = Field(None, min_length=5)

# #     quantity: float = Field(..., gt=0)   # REQUIRED (since update = stock operation)
# #     unit_of_measure: Optional[str] = None

# #     unit_price: Optional[float] = Field(None, gt=0)


# # # SELL 
# # class ProductSell(BaseModel):
# #     quantity: float = Field(..., gt=0)
# #     unit_of_measure: Optional[str] = None
# #     selling_price:float=Field(..., gt=0 )

# from typing import Optional
# from pydantic import BaseModel, Field, field_validator


# # ---------------- CREATE ----------------
# class ProductCreate(BaseModel):
#     barcode: str = Field(..., min_length=2)
#     product_name: str = Field(..., min_length=2)
#     description: str = Field(..., min_length=5)
#     quantity: float = Field(..., gt=0)
#     unit_of_measure: str  # REQUIRED for new product
#     unit_price: float = Field(..., gt=0)

#     @field_validator("barcode", "product_name", "description", mode="before")
#     def validate_fields(cls, value):
        
#         if value is None or value.strip().lower() =="string":
#             raise ValueError("Invalid value: 'string' is not allowed")
#         return value


# # ---------------- UPDATE (STOCK ADD / EDIT) ----------------
# class ProductUpdate(BaseModel):
#     product_name: Optional[str] = Field(None, min_length=2)
#     description: Optional[str] = Field(None, min_length=5)
#     quantity: float = Field(..., gt=0)         # REQUIRED — update always touches stock
#     unit_of_measure: Optional[str] = None
#     unit_price: Optional[float] = Field(None,gt=0)




# # ---------------- SELL ----------------
# class ProductSell(BaseModel):
#     quantity: float = Field(..., gt=0)
#     unit_of_measure: Optional[str] = None
#     selling_price: float = Field(..., gt=0)    # REQUIRED — needed to calculate profit

# # ---------------- DELETE / WRITE-OFF ----------------
# class ProductWriteOff(BaseModel):
#     quantity: Optional[float] = Field(None, gt=0)   # omit = delete whole product
#     unit_of_measure: Optional[str] = None            # unit of the quantity being removed
#     reason: Optional[str] = None                     # e.g. "damaged", "freebie", "expired"

#     @field_validator("quantity", "unit_of_measure", "reason", mode="before")
#     def validate_fields(cls, value):
#         if value is None:
#             return value
#         if value.strip().lower() == "string":
#             raise ValueError("Invalid value: 'string' is not allowed")
#         return value


from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ---------------- CREATE ----------------
class ProductCreate(BaseModel):
    barcode: str = Field(..., min_length=2)
    product_name: str = Field(..., min_length=2)
    description: str = Field(..., min_length=5)
    quantity: float = Field(..., gt=0)
    unit_of_measure: str  # REQUIRED for new product
    unit_price: float = Field(..., gt=0)

    @field_validator("barcode", "product_name", "description", mode="before")
    def validate_string_fields(cls, value):
        """Reject None or the Swagger default placeholder 'string'."""
        if value is None:
            raise ValueError("This field is required and cannot be null.")
        # Guard: only call .strip() on actual strings (int/float fields won't hit this validator
        # because they're not listed above, but being defensive here costs nothing)
        if isinstance(value, str) and value.strip().lower() == "string":
            raise ValueError(
                "Invalid value: 'string' is the Swagger placeholder — "
                "please provide a real value."
            )
        return value


# ---------------- UPDATE (STOCK ADD / EDIT) ----------------
class ProductUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=2)
    description: Optional[str] = Field(None, min_length=5)
    quantity: float = Field(..., gt=0)          # REQUIRED — update always touches stock
    unit_of_measure: Optional[str] = None
    unit_price: Optional[float] = Field(None, gt=0)

    @field_validator("product_name", "description", "unit_of_measure", mode="before")
    def validate_optional_string_fields(cls, value):
        """
        Only validate actual string fields.
        The isinstance check prevents crashing when numeric fields
        accidentally reach this validator (e.g. quantity coming in as int).
        """
        if value is None:
            return value
        if isinstance(value, str) and value.strip().lower() == "string":
            raise ValueError(
                "Invalid value: 'string' is the Swagger placeholder — "
                "please provide a real value or leave the field out entirely."
            )
        return value


# ---------------- SELL ----------------
class ProductSell(BaseModel):
    quantity: float = Field(..., gt=0)
    unit_of_measure: Optional[str] = None
    selling_price: float = Field(..., gt=0)     # REQUIRED — needed to calculate profit

    @field_validator("unit_of_measure", mode="before")
    def validate_unit(cls, value):
        if value is None:
            return value
        if isinstance(value, str) and value.strip().lower() == "string":
            raise ValueError(
                "Invalid unit_of_measure. "
                "Provide a real unit e.g. kg, g, l, ml, pcs, pkt, box, dozen."
            )
        return value


# ---------------- DELETE / WRITE-OFF ----------------
class ProductWriteOff(BaseModel):
    quantity: Optional[float] = Field(None, gt=0)   # omit = delete whole product
    unit_of_measure: Optional[str] = None            # unit of the quantity being removed
    reason: Optional[str] = None                     # e.g. "damaged", "expired", "freebie"

    @field_validator("unit_of_measure", "reason", mode="before")
    def validate_writeoff_strings(cls, value):
        """
        isinstance guard is critical here: quantity is a float, and Pydantic v1/v2
        sometimes passes numeric values through wildcard validators, causing
        AttributeError: 'int' object has no attribute 'strip'.
        """
        if value is None:
            return value
        if isinstance(value, str) and value.strip().lower() == "string":
            raise ValueError(
                "Invalid value: 'string' is the Swagger placeholder — "
                "provide a real value or omit the field."
            )
        return value